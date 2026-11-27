"""FCM (Firebase Cloud Messaging) client.

Upgraded (Wave 3 / task 0012, subtask B7) from the Wave-1 client that
deliberately `raise`d `NotImplementedError` to a real implementation using
the real `firebase-admin` Python SDK's documented interface shape --
`firebase_admin.messaging.send()` / `messaging.Message` /
`messaging.Notification` (verified against the live
firebase.google.com/docs/reference/admin/python/firebase_admin.messaging
reference and the firebase-admin 7.8.0 PyPI release, not guessed from
memory). `messaging.Message` also accepts the newer `fid` (Firebase
installation id) parameter, which the docs mark as `token`'s eventual
replacement -- this module deliberately keeps using `token=`, since that
is what our schema stores (`PushToken.token`, a raw device/registration
token, not an installation id) and `token` remains a supported, documented
parameter.

**Sandbox notice (this wave):** no real Firebase project exists yet. The
service-account credential is read from the `FCM_SERVICE_ACCOUNT_JSON` env
var (expected to hold a JSON service-account key, as a string) with a
clearly-fake placeholder default below, so this module never talks to a
real Firebase project unless a deployment environment explicitly
overrides the env var -- same spirit as the OTP-SMS and Razorpay stubs
from prior waves (see `subscriptions/payment_provider.py`'s
`RAZORPAY_WEBHOOK_SECRET` / `RAZORPAY_KEY_ID` pattern: a real-shaped
client, configured with a placeholder credential). The placeholder key is
not a valid PEM/RSA key, so `credentials.Certificate(...)` is expected to
fail to initialize in this environment -- that failure (and any other
delivery failure: invalid/expired token, network error, etc.) is caught
and logged inside `FcmClient.send()`, which never raises.

No real Firebase project keys are wired this wave.
"""
from __future__ import annotations

import json
import logging
import os

import firebase_admin
from firebase_admin import credentials, messaging

logger = logging.getLogger(__name__)

#: Clearly-fake placeholder service-account key -- NOT a real credential,
#: NOT parseable as a real RSA private key. Overridable via the
#: `FCM_SERVICE_ACCOUNT_JSON` env var in any environment that wires a real
#: (or a more realistic sandbox) Firebase project in a later wave.
_PLACEHOLDER_SERVICE_ACCOUNT_JSON = json.dumps(
    {
        "type": "service_account",
        "project_id": "dating-app-sandbox-PLACEHOLDER",
        "private_key_id": "PLACEHOLDER-not-a-real-key-id",
        "private_key": (
            "-----BEGIN PRIVATE KEY-----\n"
            "PLACEHOLDER-NOT-A-REAL-KEY-sandbox-only-see-fcm_client.py\n"
            "-----END PRIVATE KEY-----\n"
        ),
        "client_email": (
            "firebase-adminsdk-PLACEHOLDER@dating-app-sandbox-PLACEHOLDER.iam.gserviceaccount.com"
        ),
        "client_id": "000000000000000000000",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
)

_FIREBASE_APP_NAME = "dating-app-fcm"


def _load_service_account_info() -> dict:
    """Read the (sandboxed) service-account key from env, falling back to
    the clearly-fake placeholder above."""
    raw = os.environ.get("FCM_SERVICE_ACCOUNT_JSON", _PLACEHOLDER_SERVICE_ACCOUNT_JSON)
    return json.loads(raw)


def _get_or_init_app() -> firebase_admin.App:
    """Return the cached named Firebase app, initializing it on first use.

    A named app (rather than the default app) is used so this module never
    collides with any other Firebase app a future caller might initialize
    in the same process.
    """
    try:
        return firebase_admin.get_app(_FIREBASE_APP_NAME)
    except ValueError:
        cred = credentials.Certificate(_load_service_account_info())
        return firebase_admin.initialize_app(cred, name=_FIREBASE_APP_NAME)


class FcmClient:
    """Push notification client using the real `firebase-admin` SDK shape.

    Sandboxed this wave: configured with a placeholder service-account
    credential (see module docstring), not a real Firebase project.
    """

    def __init__(self, app: firebase_admin.App | None = None) -> None:
        self._app = app

    def send(
        self, device_token: str, title: str, body: str, data: dict[str, str] | None = None
    ) -> str | None:
        """Send a push notification to `device_token`.

        `data` is an optional `dict[str, str]` payload (FCM data messages
        require string values) delivered alongside the notification --
        used for tap-to-navigate client-side routing (e.g. `{"type":
        "new_match", "match_id": "..."}").

        Returns the FCM message id on success, or `None` if delivery
        failed for any reason. Deliberately never raises: a delivery
        failure here -- an invalid/expired token, or (expected, this
        wave) the sandbox credential not being a real Firebase project --
        must never break a calling code path, since `notification_service`
        functions are called from places (e.g. message sending) that
        cannot be allowed to fail because a push notification couldn't be
        delivered.
        """
        try:
            app = self._app or _get_or_init_app()
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                token=device_token,
                data=data,
            )
            return messaging.send(message, app=app)
        except Exception:
            logger.exception(
                "fcm.send_failed",
                extra={"event": "fcm_send_failed", "device_token": device_token},
            )
            return None
