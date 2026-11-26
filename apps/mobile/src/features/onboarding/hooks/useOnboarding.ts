import { useState } from 'react';
import { submitOnboardingProfile } from '../api/onboarding.api';

/**
 * Placeholder onboarding flow state. Holds the fields the first-run
 * profile-setup screen needs; real step-by-step wizard logic comes later.
 */
export function useOnboarding() {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function completeOnboarding() {
    setIsSubmitting(true);
    try {
      await submitOnboardingProfile({ displayName, birthDate: '', bio });
    } finally {
      setIsSubmitting(false);
    }
  }

  return { displayName, setDisplayName, bio, setBio, isSubmitting, completeOnboarding };
}
