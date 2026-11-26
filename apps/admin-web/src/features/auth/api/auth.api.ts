import { apiClient } from "@/lib/apiClient";

export interface VerifyOtpResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  is_new_user: boolean;
}

/**
 * Requests a 6-digit OTP for the given phone number, same flow as the
 * mobile app. See tasks/0008-mvp-feature-completion/plan.md for the exact
 * contract: POST /auth/otp/request {phone_number} -> 202.
 */
export async function requestOtp(phoneNumber: string): Promise<void> {
  await apiClient.post<void>("/auth/otp/request", { phone_number: phoneNumber });
}

/**
 * Verifies the OTP code and returns the admin's access/refresh tokens.
 * The backend's `is_admin` check is what actually gates admin access - this
 * just authenticates the phone number like any other account.
 * POST /auth/otp/verify {phone_number, code} -> 200
 * {access_token, refresh_token, user_id, is_new_user}.
 */
export async function verifyOtp(phoneNumber: string, code: string): Promise<VerifyOtpResponse> {
  return apiClient.post<VerifyOtpResponse>("/auth/otp/verify", { phone_number: phoneNumber, code });
}
