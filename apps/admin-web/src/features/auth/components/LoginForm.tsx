"use client";

import { Button } from "@/components/Button";

export interface LoginFormProps {
  phoneNumber: string;
  onChangePhoneNumber: (value: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
}

/**
 * Phone number capture step of admin login. Single responsibility: collect
 * a phone number and trigger an OTP request.
 */
export function LoginForm({ phoneNumber, onChangePhoneNumber, onSubmit, submitting = false }: LoginFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Phone number
        <input
          type="tel"
          placeholder="+91 90000 00000"
          value={phoneNumber}
          onChange={(event) => onChangePhoneNumber(event.target.value)}
          disabled={submitting}
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-slate-50"
        />
      </label>
      <Button type="submit" disabled={submitting || phoneNumber.trim().length === 0}>
        {submitting ? "Sending..." : "Send OTP"}
      </Button>
    </form>
  );
}
