/**
 * Pure step/field validation for the onboarding wizard. Kept free of
 * React/network concerns so it's cheap to unit test. `useOnboarding`
 * drives the wizard state; this module just answers "is this step
 * complete enough to continue".
 */

export type OnboardingStep = 'identity' | 'gender' | 'orientation' | 'intention' | 'location' | 'about';

/**
 * Wizard order. `about` (bio + interests) is last and always
 * continuable — both fields are optional per the product plan, so the
 * user is never forced to fill them in before finishing onboarding.
 */
export const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
  'identity',
  'gender',
  'orientation',
  'intention',
  'location',
  'about',
];

export type OnboardingFields = {
  displayName: string;
  dateOfBirth: string;
  gender: string | null;
  orientationPreferences: string[];
  relationshipIntention: string | null;
  city: string;
  locality: string;
};

const DATE_OF_BIRTH_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MINIMUM_AGE_YEARS = 18;

/** Must be a real calendar date, formatted YYYY-MM-DD, at least 18 years ago. */
export function isValidDateOfBirth(value: string): boolean {
  if (!DATE_OF_BIRTH_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const minimumBirthDate = new Date();
  minimumBirthDate.setUTCFullYear(minimumBirthDate.getUTCFullYear() - MINIMUM_AGE_YEARS);

  return date <= minimumBirthDate;
}

/** Whether the given step's required fields are filled in well enough to move on. */
export function canContinueFromStep(step: OnboardingStep, fields: OnboardingFields): boolean {
  switch (step) {
    case 'identity':
      return fields.displayName.trim().length > 0 && isValidDateOfBirth(fields.dateOfBirth);
    case 'gender':
      return fields.gender !== null;
    case 'orientation':
      return fields.orientationPreferences.length > 0;
    case 'intention':
      return fields.relationshipIntention !== null;
    case 'location':
      return fields.city.trim().length > 0 && fields.locality.trim().length > 0;
    case 'about':
      return true;
    default:
      return false;
  }
}
