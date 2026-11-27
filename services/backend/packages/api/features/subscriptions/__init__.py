"""Subscriptions/payments feature (task 0010, subtask B4).

Plan catalogue, Razorpay checkout-session creation, and the Razorpay
webhook that activates/extends subscriptions. Also exports
`has_active_premium(user_id) -> bool` (see `subscriptions_service.py`),
the single entitlement check every other Wave-2 feature (GPS discovery,
compatibility insights) must call before serving Premium-gated content.

NOT production-payment-ready this wave: no real Razorpay API keys are
wired. `payment_provider.py` is a documented stub (same spirit as the
OTP-SMS stub from Wave 1) that mimics Razorpay's order-creation response
shape and verifies webhook signatures against a sandboxed secret read
from an env var with a clearly-fake placeholder default.
"""
