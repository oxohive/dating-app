"""Stub FCM (Firebase Cloud Messaging) client.

No real FCM server key or network calls are made here — this is a
placeholder seam so notification_service.py has something to call during
this MVP skeleton phase.

TODO: implement real FCM HTTP v1 API integration in a future tasks/ ticket.
"""
from __future__ import annotations


class FcmClient:
    """Stub push notification client. Performs no real network calls."""

    def __init__(self, server_key: str = "") -> None:
        self.server_key = server_key

    def send(self, device_token: str, title: str, body: str) -> None:
        """Placeholder send. TODO: implement real FCM delivery."""
        raise NotImplementedError("FcmClient.send is not implemented yet")
