import { ScreenContainer } from '../../../components/ScreenContainer';
import { PhotoGallery } from '../components/PhotoGallery';
import { ProfileCard } from '../components/ProfileCard';
import { useProfile } from '../hooks/useProfile';

/**
 * Profile screen: thin composition only. Data comes from useProfile;
 * markup comes from ProfileCard / PhotoGallery.
 */
export function ProfileScreen() {
  const { data: profile } = useProfile();

  return (
    <ScreenContainer>
      <ProfileCard bio={profile.bio} displayName={profile.displayName} />
      <PhotoGallery photoUrls={profile.photoUrls} />
    </ScreenContainer>
  );
}
