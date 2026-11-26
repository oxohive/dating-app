"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { OtpInput } from "@/features/auth/components/OtpInput";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Admin login page: thin composition only. All behavior lives in useAuth;
 * all markup lives in LoginForm / OtpInput.
 */
export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const { phoneNumber, setPhoneNumber, otpRequested, isSubmitting, error, sendOtp, confirmOtp } = useAuth();

  async function handleVerify() {
    const success = await confirmOtp(code);
    if (success) {
      router.push("/");
    }
  }

  return (
    <div>
      <h1>Admin sign in</h1>
      <LoginForm phoneNumber={phoneNumber} onChangePhoneNumber={setPhoneNumber} onSubmit={sendOtp} submitting={isSubmitting} />
      {otpRequested && <OtpInput code={code} onChangeCode={setCode} onSubmit={handleVerify} disabled={isSubmitting} />}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
