import { apiClient } from '../../../core/apiClient';

export type RequestOtpResponse = {
  requestId: string;
};

export type VerifyOtpResponse = {
  accessToken: string;
  userId: string;
};

/**
 * TODO(backend-auth-otp-request): wire up to the backend's auth feature
 * slice once the OTP request endpoint exists (services/backend/auth).
 */
export async function requestOtp(phoneNumber: string): Promise<RequestOtpResponse> {
  return apiClient.post<RequestOtpResponse>('/auth/otp/request', { phoneNumber });
}

/**
 * TODO(backend-auth-otp-verify): wire up to the backend's auth feature
 * slice once the OTP verification endpoint exists (services/backend/auth).
 */
export async function verifyOtp(requestId: string, code: string): Promise<VerifyOtpResponse> {
  return apiClient.post<VerifyOtpResponse>('/auth/otp/verify', { requestId, code });
}
