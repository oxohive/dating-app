import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { getApiErrorMessage } from '../../../core/apiErrorMessage';
import { requestOtp, verifyOtp } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';

/**
 * Drives the two-step phone login flow (request OTP, then verify it).
 * Screens/components stay presentation-only; request state, session
 * storage and navigation-on-success all live here.
 */
export function useAuth() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);
  const navigation = useNavigation<RootNavigationProp>();

  const requestOtpMutation = useMutation({
    mutationFn: () => requestOtp(phoneNumber),
    onSuccess: () => setOtpRequested(true),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (code: string) => verifyOtp(phoneNumber, code),
    onSuccess: (result) => {
      setSession({
        userId: result.userId,
        phoneNumber,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      navigation.reset({
        index: 0,
        routes: [{ name: result.isNewUser ? 'Onboarding' : 'Discovery' }],
      });
    },
  });

  return {
    phoneNumber,
    setPhoneNumber,
    otpRequested,
    sendOtp: () => requestOtpMutation.mutate(),
    confirmOtp: (code: string) => verifyOtpMutation.mutate(code),
    isSendingOtp: requestOtpMutation.isPending,
    isVerifyingOtp: verifyOtpMutation.isPending,
    requestError: requestOtpMutation.error ? getApiErrorMessage(requestOtpMutation.error) : null,
    verifyError: verifyOtpMutation.error
      ? getApiErrorMessage(verifyOtpMutation.error, 'That code is invalid or has expired. Please request a new one.')
      : null,
  };
}
