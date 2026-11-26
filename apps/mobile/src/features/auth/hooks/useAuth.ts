import { useState } from 'react';
import { requestOtp, verifyOtp } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';

/**
 * Placeholder auth flow hook. Returns real-shaped state/handlers so
 * screens can be built against a stable contract now; the actual
 * request/verify calls are stubbed against auth.api.ts until the
 * backend auth endpoints land.
 */
export function useAuth() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  async function sendOtp() {
    setIsSubmitting(true);
    try {
      const { requestId: newRequestId } = await requestOtp(phoneNumber);
      setRequestId(newRequestId);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmOtp(code: string) {
    if (!requestId) return;
    setIsSubmitting(true);
    try {
      const { accessToken, userId } = await verifyOtp(requestId, code);
      setSession({ id: userId, phoneNumber }, accessToken);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    phoneNumber,
    setPhoneNumber,
    requestId,
    isSubmitting,
    sendOtp,
    confirmOtp,
  };
}
