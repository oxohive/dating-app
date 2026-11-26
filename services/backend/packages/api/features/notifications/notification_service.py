"""Notification service: decide when/what to notify users about.

Covers events like new match, new message, etc., dispatching via
workers/notification_tasks.py + fcm_client.py.

TODO: implement in a future tasks/ ticket (see tasks/ directory).
"""
