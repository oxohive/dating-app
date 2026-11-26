import {
  canContinueFromStep,
  isValidDateOfBirth,
  type OnboardingFields,
} from '../../../src/features/onboarding/validation';

const baseFields: OnboardingFields = {
  displayName: '',
  dateOfBirth: '',
  gender: null,
  orientationPreferences: [],
  relationshipIntention: null,
  city: '',
  locality: '',
};

describe('isValidDateOfBirth', () => {
  it('accepts a well-formed date at least 18 years in the past', () => {
    expect(isValidDateOfBirth('1990-01-01')).toBe(true);
  });

  it('rejects a date fewer than 18 years ago', () => {
    const recentYear = new Date().getUTCFullYear() - 1;
    expect(isValidDateOfBirth(`${recentYear}-01-01`)).toBe(false);
  });

  it('rejects a malformed date string', () => {
    expect(isValidDateOfBirth('01/01/1990')).toBe(false);
    expect(isValidDateOfBirth('not-a-date')).toBe(false);
    expect(isValidDateOfBirth('')).toBe(false);
  });
});

describe('canContinueFromStep', () => {
  it('requires a display name and a valid date of birth on the identity step', () => {
    expect(canContinueFromStep('identity', baseFields)).toBe(false);
    expect(
      canContinueFromStep('identity', { ...baseFields, displayName: 'Ananya', dateOfBirth: '1990-01-01' }),
    ).toBe(true);
  });

  it('requires a gender selection on the gender step', () => {
    expect(canContinueFromStep('gender', baseFields)).toBe(false);
    expect(canContinueFromStep('gender', { ...baseFields, gender: 'woman' })).toBe(true);
  });

  it('requires at least one orientation preference', () => {
    expect(canContinueFromStep('orientation', baseFields)).toBe(false);
    expect(canContinueFromStep('orientation', { ...baseFields, orientationPreferences: ['men'] })).toBe(true);
  });

  it('requires a relationship intention', () => {
    expect(canContinueFromStep('intention', baseFields)).toBe(false);
    expect(canContinueFromStep('intention', { ...baseFields, relationshipIntention: 'casual' })).toBe(true);
  });

  it('requires both city and locality on the location step', () => {
    expect(canContinueFromStep('location', baseFields)).toBe(false);
    expect(canContinueFromStep('location', { ...baseFields, city: 'Mumbai' })).toBe(false);
    expect(canContinueFromStep('location', { ...baseFields, city: 'Mumbai', locality: 'Bandra' })).toBe(true);
  });

  it('never blocks continuing on the optional about step', () => {
    expect(canContinueFromStep('about', baseFields)).toBe(true);
  });
});
