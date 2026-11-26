import { Button } from '../../../components/Button';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { ProfileBasicsForm } from '../components/ProfileBasicsForm';
import { useOnboarding } from '../hooks/useOnboarding';

/**
 * Onboarding screen: thin composition only. All state lives in
 * useOnboarding; all markup lives in ProfileBasicsForm.
 */
export function OnboardingScreen() {
  const { displayName, setDisplayName, bio, setBio, isSubmitting, completeOnboarding } = useOnboarding();

  return (
    <ScreenContainer>
      <ProfileBasicsForm
        bio={bio}
        displayName={displayName}
        onChangeBio={setBio}
        onChangeDisplayName={setDisplayName}
      />
      <Button disabled={isSubmitting} label="Continue" onPress={completeOnboarding} />
    </ScreenContainer>
  );
}
