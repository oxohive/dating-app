import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import type { RootNavigationProp } from '../../../app/navigation/RootNavigator';
import { getApiErrorMessage } from '../../../core/apiErrorMessage';
import { submitOnboardingProfile, type RelationshipIntention } from '../api/onboarding.api';
import { parseCommaSeparatedList } from '../utils/parseCommaSeparatedList';
import { canContinueFromStep, ONBOARDING_STEP_ORDER, type OnboardingStep } from '../validation';

/**
 * Drives the multi-step onboarding wizard: field state, step navigation
 * (gated by validation.ts), and the final submit. Screens/components
 * stay presentation-only.
 */
export function useOnboarding() {
  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [orientationPreferences, setOrientationPreferences] = useState<string[]>([]);
  const [relationshipIntention, setRelationshipIntention] = useState<RelationshipIntention | null>(null);
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const navigation = useNavigation<RootNavigationProp>();

  const step: OnboardingStep = ONBOARDING_STEP_ORDER[stepIndex] ?? 'identity';
  const isLastStep = stepIndex === ONBOARDING_STEP_ORDER.length - 1;

  const mutation = useMutation({
    mutationFn: submitOnboardingProfile,
    onSuccess: () => {
      navigation.reset({ index: 0, routes: [{ name: 'Discovery' }] });
    },
  });

  function toggleOrientationPreference(value: string) {
    setOrientationPreferences((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
    );
  }

  function goBack() {
    setStepIndex((index) => Math.max(0, index - 1));
  }

  function goNext() {
    if (!isLastStep) {
      setStepIndex((index) => index + 1);
      return;
    }

    if (!gender || !relationshipIntention) {
      return;
    }

    mutation.mutate({
      displayName: displayName.trim(),
      dateOfBirth,
      gender,
      orientationPreferences,
      relationshipIntention,
      city: city.trim(),
      locality: locality.trim(),
      bio: bio.trim() || undefined,
      interests: parseCommaSeparatedList(interests),
    });
  }

  const canContinue = canContinueFromStep(step, {
    displayName,
    dateOfBirth,
    gender,
    orientationPreferences,
    relationshipIntention,
    city,
    locality,
  });

  return {
    step,
    stepIndex,
    totalSteps: ONBOARDING_STEP_ORDER.length,
    isLastStep,
    displayName,
    setDisplayName,
    dateOfBirth,
    setDateOfBirth,
    gender,
    setGender,
    orientationPreferences,
    toggleOrientationPreference,
    relationshipIntention,
    setRelationshipIntention,
    city,
    setCity,
    locality,
    setLocality,
    bio,
    setBio,
    interests,
    setInterests,
    canContinue,
    goNext,
    goBack,
    isSubmitting: mutation.isPending,
    submitError: mutation.error ? getApiErrorMessage(mutation.error) : null,
  };
}
