/**
 * Pure client-side validation for the login form. Kept free of any
 * React/network concerns so it's cheap to unit test and reusable from
 * both the form components (to enable/disable submit) and the hook.
 */

const MIN_PHONE_DIGITS = 10;

/**
 * A lightweight "is this plausibly a phone number" check — not a full
 * E.164 validator, just enough to stop obviously-empty/too-short input
 * from reaching the backend. The backend remains the source of truth.
 */
export function isLikelyValidPhoneNumber(value: string): boolean {
  const digitsOnly = value.replace(/\D/g, '');
  return digitsOnly.length >= MIN_PHONE_DIGITS;
}

const OTP_CODE_PATTERN = /^\d{6}$/;

/** The backend issues 6-digit numeric OTP codes. */
export function isValidOtpCode(value: string): boolean {
  return OTP_CODE_PATTERN.test(value);
}
