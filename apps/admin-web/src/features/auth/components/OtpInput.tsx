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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320, marginTop: 16 }}>
      <label>
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
        />
      </label>
      <Button type="submit" disabled={disabled || code.trim().length === 0}>
        {disabled ? "Verifying..." : "Verify & sign in"}
      </Button>
    </form>
  );
}
