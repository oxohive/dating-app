import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { ErrorText } from '../../../components/ErrorText';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { spacing } from '../../../core/theme';
import { AboutYouForm } from '../components/AboutYouForm';
import { GenderForm } from '../components/GenderForm';
import { LocationForm } from '../components/LocationForm';
import { OnboardingProgress } from '../components/OnboardingProgress';
import { OrientationPreferencesForm } from '../components/OrientationPreferencesForm';
import { ProfileBasicsForm } from '../components/ProfileBasicsForm';
import { RelationshipIntentionForm } from '../components/RelationshipIntentionForm';
import { useOnboarding } from '../hooks/useOnboarding';

/**
 * Onboarding screen: thin composition only. All state/validation lives
 * in useOnboarding; all step markup lives in its own form component.
 */
export function OnboardingScreen() {
  const onboarding = useOnboarding();

  return (
    <ScreenContainer>
      <OnboardingProgress currentStep={onboarding.stepIndex + 1} totalSteps={onboarding.totalSteps} />

      {onboarding.step === 'identity' ? (
        <ProfileBasicsForm
          dateOfBirth={onboarding.dateOfBirth}
          displayName={onboarding.displayName}
          onChangeDateOfBirth={onboarding.setDateOfBirth}
          onChangeDisplayName={onboarding.setDisplayName}
        />
      ) : null}

      {onboarding.step === 'gender' ? <GenderForm onChange={onboarding.setGender} value={onboarding.gender} /> : null}

      {onboarding.step === 'orientation' ? (
        <OrientationPreferencesForm
          onToggle={onboarding.toggleOrientationPreference}
          value={onboarding.orientationPreferences}
        />
      ) : null}

      {onboarding.step === 'intention' ? (
        <RelationshipIntentionForm onChange={onboarding.setRelationshipIntention} value={onboarding.relationshipIntention} />
      ) : null}

      {onboarding.step === 'location' ? (
        <LocationForm
          city={onboarding.city}
          locality={onboarding.locality}
          onChangeCity={onboarding.setCity}
          onChangeLocality={onboarding.setLocality}
        />
      ) : null}

      {onboarding.step === 'about' ? (
        <AboutYouForm
          bio={onboarding.bio}
          interests={onboarding.interests}
          onChangeBio={onboarding.setBio}
          onChangeInterests={onboarding.setInterests}
        />
      ) : null}

      {onboarding.submitError ? <ErrorText message={onboarding.submitError} /> : null}

      <View style={styles.actions}>
        {onboarding.stepIndex > 0 ? <Button label="Back" onPress={onboarding.goBack} variant="secondary" /> : null}
        <Button
          disabled={!onboarding.canContinue || onboarding.isSubmitting}
          label={onboarding.isLastStep ? 'Finish' : 'Continue'}
          onPress={onboarding.goNext}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
