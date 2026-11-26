import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { ErrorText } from '../../../components/ErrorText';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { spacing } from '../../../core/theme';
import { useLogout } from '../../auth/hooks/useLogout';
import { GenderForm } from '../../onboarding/components/GenderForm';
import { OrientationPreferencesForm } from '../../onboarding/components/OrientationPreferencesForm';
import { RelationshipIntentionForm } from '../../onboarding/components/RelationshipIntentionForm';
import { AddPhotoButton } from '../components/AddPhotoButton';
import { PhotoGallery } from '../components/PhotoGallery';
import { ProfileCard } from '../components/ProfileCard';
import { ProfileTextFieldsForm } from '../components/ProfileTextFieldsForm';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { useProfile } from '../hooks/useProfile';
import { useProfileEditForm } from '../hooks/useProfileEditForm';

/**
 * Profile screen: thin composition only. Viewing, editing, photo upload
 * and logout behavior all live in hooks; markup lives in the imported
 * components.
 */
export function ProfileScreen() {
  const { data: profile, isLoading } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const { logOut, isLoggingOut } = useLogout();
  const editForm = useProfileEditForm(profile, () => setIsEditing(false));
  const sortedPhotos = [...(profile?.photos ?? [])].sort((a, b) => a.position - b.position);
  const { addPhoto, isUploading, error: photoError } = usePhotoUpload(sortedPhotos.length);

  if (isLoading || !profile) {
    return (
      <ScreenContainer>
        <Text>Loading your profile...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {isEditing ? (
        <View style={styles.section}>
          <ProfileTextFieldsForm
            bio={editForm.bio}
            city={editForm.city}
            displayName={editForm.displayName}
            interests={editForm.interests}
            locality={editForm.locality}
            onChangeBio={editForm.setBio}
            onChangeCity={editForm.setCity}
            onChangeDisplayName={editForm.setDisplayName}
            onChangeInterests={editForm.setInterests}
            onChangeLocality={editForm.setLocality}
          />
          <GenderForm onChange={editForm.setGender} value={editForm.gender} />
          <OrientationPreferencesForm onToggle={editForm.toggleOrientationPreference} value={editForm.orientationPreferences} />
          <RelationshipIntentionForm onChange={editForm.setRelationshipIntention} value={editForm.relationshipIntention} />
          {editForm.saveError ? <ErrorText message={editForm.saveError} /> : null}
          <View style={styles.actions}>
            <Button label="Cancel" onPress={() => setIsEditing(false)} variant="secondary" />
            <Button disabled={editForm.isSaving} label="Save" onPress={editForm.save} />
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <ProfileCard bio={profile.bio ?? ''} city={profile.city} displayName={profile.displayName} locality={profile.locality} />
          <PhotoGallery photoUrls={sortedPhotos.map((photo) => photo.url)} />
          <AddPhotoButton isUploading={isUploading} onPress={addPhoto} />
          {photoError ? <ErrorText message={photoError} /> : null}
          <Button label="Edit profile" onPress={() => setIsEditing(true)} variant="secondary" />
        </View>
      )}
      <Button disabled={isLoggingOut} label="Log out" onPress={logOut} variant="secondary" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
