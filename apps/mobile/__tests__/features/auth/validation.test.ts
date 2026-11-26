import { isLikelyValidPhoneNumber, isValidOtpCode } from '../../../src/features/auth/validation';

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
