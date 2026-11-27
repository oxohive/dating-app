/**
 * Pure client-side validation for the login form. Kept free of any
 * React/network concerns so it's cheap to unit test and reusable from
 * both the form components (to enable/disable submit) and the hook.
 */

const LOCAL_PHONE_DIGITS = 10;
const COUNTRY_CODE_DIGITS = '91';

/**
 * Extracts the India mobile number's local digits from arbitrary input,
 * discarding a leading "91" country-code prefix if present. The app has
 * no country-code picker yet (single-market MVP, India-only), but the
 * login field's live formatting (see `formatPhoneNumberInput`) always
 * inserts a "+91 " prefix, so validation and formatting must agree on
 * what counts as a country code vs. a local digit, or the submit button
 * would enable after only 8 local digits instead of the real 10.
 */
function extractLocalDigits(value: string): string {
  const digitsOnly = value.replace(/\D/g, '');
  return digitsOnly.startsWith(COUNTRY_CODE_DIGITS) ? digitsOnly.slice(COUNTRY_CODE_DIGITS.length) : digitsOnly;
}

/**
 * A lightweight "is this plausibly a phone number" check — not a full
 * E.164 validator, just enough to stop obviously-empty/too-short input
 * from reaching the backend. The backend remains the source of truth.
 */
export function isLikelyValidPhoneNumber(value: string): boolean {
  return extractLocalDigits(value).length >= LOCAL_PHONE_DIGITS;
}

/**
 * Live formatting-as-you-type for the phone number field: renders typed
 * digits as "+91 XXXXX XXXXX" (India's standard 10-digit mobile grouping)
 * instead of leaving the user to type into a bare, unformatted field.
 * Pure and idempotent — safe to re-run on its own previous output, which
 * is how a controlled `TextInput` uses it on every keystroke.
 *
 * Known limitation: if the user backspaces into the middle of the "+91 "
 * prefix itself (rather than the digits after it), the next keystroke's
 * re-format will re-insert the prefix and may look like that edit had no
 * effect. A full masked-text-input would handle cursor position; this
 * lightweight version doesn't track it, which is an acceptable trade-off
 * for a single-market MVP with no masked-input dependency installed.
 */
export function formatPhoneNumberInput(value: string): string {
  const localDigits = extractLocalDigits(value).slice(0, LOCAL_PHONE_DIGITS);
  if (localDigits.length === 0) {
    return '';
  }
  const firstGroup = localDigits.slice(0, 5);
  const secondGroup = localDigits.slice(5);
  return secondGroup ? `+91 ${firstGroup} ${secondGroup}` : `+91 ${firstGroup}`;
}

/**
 * Inline, while-typing validation feedback for the phone number field —
 * deliberately not just a post-submit error. Returns `null` when there's
 * nothing useful to say: the field is empty, or the number already looks
 * complete.
 */
export function getPhoneNumberInputHint(value: string): string | null {
  const localDigitCount = extractLocalDigits(value).length;
  if (localDigitCount === 0 || localDigitCount >= LOCAL_PHONE_DIGITS) {
    return null;
  }
  const remaining = LOCAL_PHONE_DIGITS - localDigitCount;
  return `Enter ${remaining} more digit${remaining === 1 ? '' : 's'} of your mobile number`;
}

const OTP_CODE_PATTERN = /^\d{6}$/;

/** The backend issues 6-digit numeric OTP codes. */
export function isValidOtpCode(value: string): boolean {
  return OTP_CODE_PATTERN.test(value);
}
