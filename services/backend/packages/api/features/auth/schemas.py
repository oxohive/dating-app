"""Auth request/response schemas (OTP request/verify, token pairs)."""
from __future__ import annotations

import uuid

from pydantic import BaseModel, field_validator

from packages.api.features.auth.validation import normalize_phone_number, validate_otp_code


class OtpRequestIn(BaseModel):
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        try:
            return normalize_phone_number(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc


class OtpVerifyIn(BaseModel):
    phone_number: str
    code: str

    @field_validator("phone_number")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        try:
            return normalize_phone_number(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("code")
    @classmethod
    def _validate_code(cls, value: str) -> str:
        try:
            return validate_otp_code(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc


class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    user_id: uuid.UUID
    is_new_user: bool


class RefreshIn(BaseModel):
    refresh_token: str


class RefreshOut(BaseModel):
    access_token: str
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str
