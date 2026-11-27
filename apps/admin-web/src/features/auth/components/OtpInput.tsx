"use client";

import { Button } from "@/components/Button";

export interface OtpInputProps {
  code: string;
  onChangeCode: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

/**
 * OTP code capture step of admin login. Single responsibility: collect the
 * 6-digit code and trigger verification. Shown once a code has been
 * requested for the entered phone number.
 */
export function OtpInput({ code, onChangeCode, onSubmit, disabled = false }: OtpInputProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        6-digit code
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(event) => onChangeCode(event.target.value)}
          disabled={disabled}
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm tracking-widest text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-slate-50"
        />
      </label>
      <Button type="submit" disabled={disabled || code.trim().length === 0}>
        {disabled ? "Verifying..." : "Verify & sign in"}
      </Button>
    </form>
  );
}
