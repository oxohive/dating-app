"""Notification service: decide when/what to notify users about.

Upgraded (Wave 3 / task 0012, subtask B7) from the Wave-1 log-only stub to
real delivery: `notify_new_like`, `notify_new_match`, and
`notify_new_message` now resolve `profile_id -> user_id` (push tokens and
preferences are naturally per-`user_id` -- device-level, not
profile-level), look up the user's registered device push token(s) via
`push_token_service`, check the relevant `NotificationPreference` flag via
`preferences_service` (skipping delivery if the user disabled that event
type), and call `FcmClient.send()` for each token.

**Signatures are unchanged from the Wave-1 stub, on purpose:**
`messaging/message_service.py` already calls
`notification_service.notify_new_message(recipient_profile_id,
message.id)` (a real, working Wave-1 call site, wrapped in its own
try/except) -- renaming or reshaping these functions' signatures would
require editing that call site, which is outside this feature's owned
paths this wave. The only addition is an optional, keyword-only `db`
parameter (default `None`), purely additive and invisible to existing
positional callers: when omitted, a short-lived session is opened
internally via `core.database.get_session_factory()` and closed before
returning.

**Still a plumbing wave, not a verified-live-delivery one:** `FcmClient` is
configured with a placeholder/sandboxed service-account credential (see
`fcm_client.py`), so every `FcmClient.send()` call is expected to fail
against the real FCM backend in this environment -- that failure is
caught and logged inside `FcmClient.send()` itself, never raised. On top
of that, every function below also wraps its *entire* body in its own
try/except, so a failure anywhere in this module (DB lookup error, etc.)
can never propagate to a caller either -- defense in depth, since
`notify_new_message`'s only current caller already wraps the call in
try/except, but `notify_new_like`/`notify_new_match` will be called by
future integration-step code that may not.
"""
from __future__ import annotations

import logging
import uuid
from collections.abc import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_session_factory
from packages.api.features.messaging.models import Message
from packages.api.features.notifications import constants, preferences_service, push_token_service
from packages.api.features.notifications.fcm_client import FcmClient
from packages.api.features.profiles.models import Profile

logger = logging.getLogger(__name__)

_fcm_client = FcmClient()

#: Notification copy per event type. Kept minimal/generic this wave --
#: richer, localized copy (e.g. including the liker's name) is an
#: integration-step/future-wave concern once the call sites that pass
#: richer context are wired.
_EVENT_COPY: dict[str, tuple[str, str]] = {
    constants.EVENT_NEW_LIKE: ("New like", "Someone liked your profile!"),
    constants.EVENT_NEW_MATCH: ("New match", "You have a new match!"),
    constants.EVENT_NEW_MESSAGE: ("New message", "You have a new message!"),
}


def _resolve_user_id(db: DbSession, profile_id: uuid.UUID) -> uuid.UUID | None:
    """Resolve `profile_id -> Profile.user_id`. Returns `None` if the
    profile doesn't exist (e.g. deleted between the triggering event and
    this dispatch)."""
    return db.scalar(select(Profile.user_id).where(Profile.id == profile_id))


def _resolve_conversation_id(db: DbSession, message_id: uuid.UUID) -> uuid.UUID | None:
    """Resolve `Message.id -> Message.conversation_id` (cross-feature
    read-only import from `messaging.models`, same convention as this
    module's own `Profile` import above). Returns `None` if the message
    doesn't exist."""
    return db.scalar(select(Message.conversation_id).where(Message.id == message_id))


def _send_to_user(
    db: DbSession,
    user_id: uuid.UUID,
    event_type: str,
    log_context: dict,
    *,
    title: str | None = None,
    body: str | None = None,
    extra_data: dict | None = None,
) -> None:
    """Check `user_id`'s preference for `event_type`, and send via FCM to
    every one of their registered devices.

    `title`/`body` override `_EVENT_COPY[event_type]` when supplied
    (both must be given together, or neither). `extra_data` is merged
    into the `data` payload sent to every token, after stringifying every
    value -- FCM data payloads must be `dict[str, str]`.
    """
    if not preferences_service.is_event_enabled(db, user_id, event_type):
        logger.info(
            "notification.skipped.preference_disabled",
            extra={"event": event_type, "user_id": str(user_id), **log_context},
        )
        return

    tokens = push_token_service.get_tokens_for_user(db, user_id)
    if not tokens:
        logger.info(
            "notification.skipped.no_push_token",
            extra={"event": event_type, "user_id": str(user_id), **log_context},
        )
        return

    resolved_title, resolved_body = (
        (title, body) if title is not None and body is not None else _EVENT_COPY[event_type]
    )

    data = {"type": event_type}
    if extra_data:
        data.update({key: str(value) for key, value in extra_data.items()})

    for push_token in tokens:
        # FcmClient.send() is itself defensive and never raises (see its
        # own docstring) -- no per-token try/except needed here.
        _fcm_client.send(push_token.token, resolved_title, resolved_body, data)


def _dispatch(
    db: DbSession,
    profile_id: uuid.UUID,
    event_type: str,
    log_context: dict,
    *,
    title: str | None = None,
    body: str | None = None,
    extra_data: dict | None = None,
) -> None:
    """Resolve `profile_id -> user_id` and delegate to `_send_to_user`."""
    user_id = _resolve_user_id(db, profile_id)
    if user_id is None:
        logger.info(
            "notification.skipped.unknown_profile",
            extra={"event": event_type, **log_context},
        )
        return

    _send_to_user(
        db, user_id, event_type, log_context, title=title, body=body, extra_data=extra_data
    )


def _run_with_session(db: DbSession | None, fn: Callable[[DbSession], None]) -> None:
    """Run `fn(db)`, opening (and closing) a short-lived session when `db`
    is not already supplied by the caller."""
    if db is not None:
        fn(db)
        return

    session_factory = get_session_factory()
    session = session_factory()
    try:
        fn(session)
    finally:
        session.close()


def notify_new_like(profile_id: uuid.UUID, *, db: DbSession | None = None) -> None:
    """Notify `profile_id` that someone liked them."""
    try:
        _run_with_session(
            db,
            lambda session: _dispatch(
                session,
                profile_id,
                constants.EVENT_NEW_LIKE,
                {"profile_id": str(profile_id)},
            ),
        )
    except Exception:  # pragma: no cover - defensive: must never raise to the caller
        logger.exception(
            "notification.dispatch_failed",
            extra={"event": constants.EVENT_NEW_LIKE, "profile_id": str(profile_id)},
        )


def notify_new_match(
    profile_id: uuid.UUID, match_id: uuid.UUID, *, db: DbSession | None = None
) -> None:
    """Notify `profile_id` that they have a new match."""
    try:
        _run_with_session(
            db,
            lambda session: _dispatch(
                session,
                profile_id,
                constants.EVENT_NEW_MATCH,
                {"profile_id": str(profile_id), "match_id": str(match_id)},
                extra_data={"match_id": str(match_id)},
            ),
        )
    except Exception:  # pragma: no cover - defensive: must never raise to the caller
        logger.exception(
            "notification.dispatch_failed",
            extra={
                "event": constants.EVENT_NEW_MATCH,
                "profile_id": str(profile_id),
                "match_id": str(match_id),
            },
        )


def notify_new_message(
    profile_id: uuid.UUID, message_id: uuid.UUID, *, db: DbSession | None = None
) -> None:
    """Notify `profile_id` that they received a new message.

    Called today by `messaging/message_service.py.send_message` as
    `notify_new_message(recipient_profile_id, message.id)` -- positional,
    two-argument, no `db` -- which remains fully compatible with this
    upgraded signature (that call site's own try/except is now a second,
    redundant layer of protection on top of this function's own).

    The `data` payload sent to the client includes `conversation_id` (in
    addition to `message_id`), resolved here via `_resolve_conversation_id`,
    so the mobile client's `notificationNavigation.ts` can route a tap
    straight into the right conversation -- it reads `data.conversation_id`
    (snake_case), with a `conversationId` camelCase fallback it tries
    first; this module always sends the snake_case key.
    """

    def _notify(session: DbSession) -> None:
        conversation_id = _resolve_conversation_id(session, message_id)
        extra_data = {"message_id": str(message_id)}
        if conversation_id is not None:
            extra_data["conversation_id"] = str(conversation_id)
        _dispatch(
            session,
            profile_id,
            constants.EVENT_NEW_MESSAGE,
            {"profile_id": str(profile_id), "message_id": str(message_id)},
            extra_data=extra_data,
        )

    try:
        _run_with_session(db, _notify)
    except Exception:  # pragma: no cover - defensive: must never raise to the caller
        logger.exception(
            "notification.dispatch_failed",
            extra={
                "event": constants.EVENT_NEW_MESSAGE,
                "profile_id": str(profile_id),
                "message_id": str(message_id),
            },
        )


def notify_verification_result(
    profile_id: uuid.UUID, approved: bool, *, db: DbSession | None = None
) -> None:
    """Notify `profile_id` of their verification review outcome."""
    title, body = (
        ("Verification approved", "Your profile has been verified!")
        if approved
        else ("Verification update", "Your verification could not be approved. You can try again.")
    )
    try:
        _run_with_session(
            db,
            lambda session: _dispatch(
                session,
                profile_id,
                constants.EVENT_VERIFICATION_RESULT,
                {"profile_id": str(profile_id), "approved": str(approved)},
                title=title,
                body=body,
                extra_data={"status": "approved" if approved else "rejected"},
            ),
        )
    except Exception:  # pragma: no cover - defensive: must never raise to the caller
        logger.exception(
            "notification.dispatch_failed",
            extra={"event": constants.EVENT_VERIFICATION_RESULT, "profile_id": str(profile_id)},
        )


def notify_subscription_activated(
    user_id: uuid.UUID, plan: str, *, db: DbSession | None = None
) -> None:
    """Notify `user_id` that their subscription is now active.

    Takes `user_id` directly (not `profile_id`) since subscriptions are
    modeled per-user, not per-profile, in `features/subscriptions` --
    there is no profile to resolve from at this call site.
    """
    try:
        _run_with_session(
            db,
            lambda session: _send_to_user(
                session,
                user_id,
                constants.EVENT_SUBSCRIPTION_ACTIVATED,
                {"user_id": str(user_id), "plan": plan},
                title="Subscription activated",
                body="Your Premium subscription is now active!",
                extra_data={"plan": plan},
            ),
        )
    except Exception:  # pragma: no cover - defensive: must never raise to the caller
        logger.exception(
            "notification.dispatch_failed",
            extra={"event": constants.EVENT_SUBSCRIPTION_ACTIVATED, "user_id": str(user_id)},
        )
