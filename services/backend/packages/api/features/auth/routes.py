"""Auth feature routes: OTP request/verify, token refresh, logout."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth import auth_service
from packages.api.features.auth.schemas import (
    LogoutIn,
    OtpRequestIn,
    OtpVerifyIn,
    RefreshIn,
    RefreshOut,
    TokenPairOut,
)

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]


@router.post("/otp/request", status_code=status.HTTP_202_ACCEPTED)
def post_otp_request(payload: OtpRequestIn) -> None:
    auth_service.request_login_otp(payload.phone_number)


@router.post("/otp/verify", response_model=TokenPairOut)
def post_otp_verify(payload: OtpVerifyIn, db: DbDependency) -> TokenPairOut:
    try:
        access_token, refresh_token, user, is_new_user = auth_service.verify_otp_and_login(
            db, payload.phone_number, payload.code
        )
    except auth_service.InvalidOtpError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return TokenPairOut(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        is_new_user=is_new_user,
    )


@router.post("/refresh", response_model=RefreshOut)
def post_refresh(payload: RefreshIn, db: DbDependency) -> RefreshOut:
    try:
        access_token, refresh_token = auth_service.refresh_tokens(db, payload.refresh_token)
    except auth_service.InvalidRefreshTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return RefreshOut(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def post_logout(payload: LogoutIn, db: DbDependency) -> None:
    auth_service.logout(db, payload.refresh_token)
