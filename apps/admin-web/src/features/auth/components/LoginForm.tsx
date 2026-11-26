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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
      <label>
        Phone number
        <input
          type="tel"
          placeholder="+91 90000 00000"
          value={phoneNumber}
          onChange={(event) => onChangePhoneNumber(event.target.value)}
          disabled={submitting}
          required
        />
      </label>
      <Button type="submit" disabled={submitting || phoneNumber.trim().length === 0}>
        {submitting ? "Sending..." : "Send OTP"}
      </Button>
    </form>
  );
}
