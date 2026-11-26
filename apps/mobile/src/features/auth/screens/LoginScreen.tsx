import { useState } from 'react';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { LoginForm } from '../components/LoginForm';
import { OtpInput } from '../components/OtpInput';
import { useAuth } from '../hooks/useAuth';

/**
 * Login screen: thin composition only. All behavior lives in useAuth; all
 * markup lives in LoginForm / OtpInput.
 */
export function LoginScreen() {
  const [otpCode, setOtpCode] = useState('');
  const { phoneNumber, setPhoneNumber, requestId, isSubmitting, sendOtp, confirmOtp } = useAuth();

  return (
    <ScreenContainer>
      <LoginForm
        onChangePhoneNumber={setPhoneNumber}
        onSubmit={sendOtp}
        phoneNumber={phoneNumber}
        submitting={isSubmitting}
      />
      {requestId ? (
        <OtpInput
          code={otpCode}
          disabled={isSubmitting}
          onChangeCode={setOtpCode}
          onSubmit={() => confirmOtp(otpCode)}
        />
      ) : null}
    </ScreenContainer>
  );
}
