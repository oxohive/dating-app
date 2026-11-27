import {
  formatPhoneNumberInput,
  getPhoneNumberInputHint,
  isLikelyValidPhoneNumber,
  isValidOtpCode,
} from '../../../src/features/auth/validation';

describe('isLikelyValidPhoneNumber', () => {
  it('accepts a number with at least 10 digits, formatting included', () => {
    expect(isLikelyValidPhoneNumber('+91 90000 00000')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isLikelyValidPhoneNumber('')).toBe(false);
  });

  it('rejects a too-short number', () => {
    expect(isLikelyValidPhoneNumber('12345')).toBe(false);
  });

  it('rejects 10 raw digits that are only 8 local digits once the "91" country code is subtracted', () => {
    // 2-digit country code + 8 local digits = 10 raw digits, but the real
    // local number is incomplete. This is the bug `extractLocalDigits`
    // guards against now that the login field auto-prefixes "+91".
    expect(isLikelyValidPhoneNumber('9112345678')).toBe(false);
  });

  it('accepts a bare 10-digit local number with no country code typed', () => {
    expect(isLikelyValidPhoneNumber('9000000000')).toBe(true);
  });
});

describe('formatPhoneNumberInput', () => {
  it('returns an empty string for no digits', () => {
    expect(formatPhoneNumberInput('')).toBe('');
  });

  it('formats a partial number without the second group yet', () => {
    expect(formatPhoneNumberInput('900')).toBe('+91 900');
  });

  it('formats a complete 10-digit number into two groups', () => {
    expect(formatPhoneNumberInput('9000000000')).toBe('+91 90000 00000');
  });

  it('is idempotent: re-formatting its own output is unchanged', () => {
    const once = formatPhoneNumberInput('9000000000');
    expect(formatPhoneNumberInput(once)).toBe(once);
  });

  it('truncates input longer than 10 local digits', () => {
    expect(formatPhoneNumberInput('900000000012345')).toBe('+91 90000 00000');
  });
});

describe('getPhoneNumberInputHint', () => {
  it('returns null for an empty field', () => {
    expect(getPhoneNumberInputHint('')).toBeNull();
  });

  it('returns null once the number is complete', () => {
    expect(getPhoneNumberInputHint('+91 90000 00000')).toBeNull();
  });

  it('reports how many digits remain while typing', () => {
    expect(getPhoneNumberInputHint('+91 900')).toBe('Enter 7 more digits of your mobile number');
  });

  it('uses the singular form for exactly one remaining digit', () => {
    expect(getPhoneNumberInputHint('+91 90000 0000')).toBe('Enter 1 more digit of your mobile number');
  });
});

describe('isValidOtpCode', () => {
  it('accepts exactly 6 digits', () => {
    expect(isValidOtpCode('123456')).toBe(true);
  });

  it('rejects codes of the wrong length', () => {
    expect(isValidOtpCode('12345')).toBe(false);
    expect(isValidOtpCode('1234567')).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(isValidOtpCode('12345a')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidOtpCode('')).toBe(false);
  });
});
