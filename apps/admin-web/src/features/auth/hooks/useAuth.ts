import { useCallback, useState } from "react";
import { requestOtp, verifyOtp } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ApiError } from "@/lib/apiClient";

export interface UseAuthResult {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  otpRequested: boolean;
  isSubmitting: boolean;
  error: string | null;
  sendOtp: () => Promise<void>;
  confirmOtp: (code: string) => Promise<boolean>;
}

/**
 * Drives the admin login flow: request an OTP for a phone number, then
 * verify it and persist the access token. Mirrors the mobile app's
 * phone + OTP flow; the backend's `is_admin` check (not this hook) is what
 * actually gates access to the rest of the dashboard.
 */
export function useAuth(): UseAuthResult {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  const sendOtp = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await requestOtp(phoneNumber);
      setOtpRequested(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the OTP. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [phoneNumber]);

  const confirmOtp = useCallback(
    async (code: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const { access_token } = await verifyOtp(phoneNumber, code);
        setAccessToken(access_token);
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not verify the code. Please try again.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [phoneNumber, setAccessToken]
  );

  return { phoneNumber, setPhoneNumber, otpRequested, isSubmitting, error, sendOtp, confirmOtp };
}
