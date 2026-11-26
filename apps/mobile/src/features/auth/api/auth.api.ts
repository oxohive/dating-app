import { apiClient } from '../../../core/apiClient';

export type VerifyOtpResult = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  isNewUser: boolean;
};

export type RefreshSessionResult = {
  accessToken: string;
  refreshToken: string;
};

type VerifyOtpApiResponse = {
  access_token: string;
  refresh_token: string;
  user_id: string;
  is_new_user: boolean;
};

type RefreshSessionApiResponse = {
  access_token: string;
  refresh_token: string;
};

/**
 * Step 1 of login: ask the backend to text a 6-digit OTP to this phone
 * number. `POST /auth/otp/request` responds 202 with no body.
 */
export async function requestOtp(phoneNumber: string): Promise<void> {
  await apiClient.post<void>('/auth/otp/request', { phone_number: phoneNumber }, { skipAuth: true });
}

/**
 * Step 2 of login: verify the code the user received and exchange it for
 * a session (access + refresh token pair).
 */
export async function verifyOtp(phoneNumber: string, code: string): Promise<VerifyOtpResult> {
  const response = await apiClient.post<VerifyOtpApiResponse>(
    '/auth/otp/verify',
    { phone_number: phoneNumber, code },
    { skipAuth: true },
  );

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    userId: response.user_id,
    isNewUser: response.is_new_user,
  };
}

/**
 * Exchanges a refresh token for a new access/refresh token pair. Called
 * by the auth store's apiClient integration on a 401 — never call this
 * directly from a screen.
 */
export async function refreshSession(refreshToken: string): Promise<RefreshSessionResult> {
  const response = await apiClient.post<RefreshSessionApiResponse>(
    '/auth/refresh',
    { refresh_token: refreshToken },
    { skipAuth: true },
  );

  return { accessToken: response.access_token, refreshToken: response.refresh_token };
}

/** Revokes the current session's refresh token on the backend. */
export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post<void>('/auth/logout', { refresh_token: refreshToken });
}
