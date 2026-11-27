"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
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
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100">
            <ShieldCheck size={20} className="text-primary-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Admin sign in</h1>
          <p className="text-sm text-slate-500">Enter your phone number to receive a one-time code.</p>
        </div>
        <LoginForm phoneNumber={phoneNumber} onChangePhoneNumber={setPhoneNumber} onSubmit={sendOtp} submitting={isSubmitting} />
        {otpRequested && <OtpInput code={code} onChangeCode={setCode} onSubmit={handleVerify} disabled={isSubmitting} />}
        {error && <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
