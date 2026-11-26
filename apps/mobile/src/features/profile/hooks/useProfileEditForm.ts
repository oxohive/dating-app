import { useState } from 'react';
import { getApiErrorMessage } from '../../../core/apiErrorMessage';
import type { RelationshipIntention } from '../../onboarding/api/onboarding.api';
import { parseCommaSeparatedList } from '../../onboarding/utils/parseCommaSeparatedList';
import type { ProfileDto } from '../api/profile.api';
import { useUpdateProfile } from './useUpdateProfile';

/**
 * Local editable copy of the profile fields a person can change from the
 * profile screen, plus the save flow. Kept separate from useProfile
 * (read) and useUpdateProfile (the raw mutation) so each hook has one
 * job. `profile` may be undefined while the initial GET is still
 * loading — hooks must still be called unconditionally, so every piece
 * of state just starts empty and syncs once the profile arrives.
 */
export function useProfileEditForm(profile: ProfileDto | undefined, onSaved: () => void) {
  // Tracks which profile the fields below were last seeded from, so a
  // freshly-loaded (or re-fetched) profile can seed the editable copy
  // during render — the pattern React recommends instead of an effect
  // for "adjust state when a prop changes" (avoids an extra render).
  const [seededProfileId, setSeededProfileId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [locality, setLocality] = useState(profile?.locality ?? '');
  const [interests, setInterests] = useState((profile?.interests ?? []).join(', '));
  const [gender, setGender] = useState<string | null>(profile?.gender ?? null);
  const [orientationPreferences, setOrientationPreferences] = useState<string[]>(profile?.orientationPreferences ?? []);
  const [relationshipIntention, setRelationshipIntention] = useState<RelationshipIntention | null>(
    profile?.relationshipIntention ?? null,
  );
  const mutation = useUpdateProfile();

  if (profile && profile.id !== seededProfileId) {
    setSeededProfileId(profile.id);
    setDisplayName(profile.displayName);
    setBio(profile.bio ?? '');
    setCity(profile.city);
    setLocality(profile.locality);
    setInterests((profile.interests ?? []).join(', '));
    setGender(profile.gender);
    setOrientationPreferences(profile.orientationPreferences);
    setRelationshipIntention(profile.relationshipIntention);
  }

  function toggleOrientationPreference(value: string) {
    setOrientationPreferences((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
    );
  }

  function save() {
    if (!gender || !relationshipIntention) {
      return;
    }

    mutation.mutate(
      {
        displayName: displayName.trim(),
        bio: bio.trim(),
        city: city.trim(),
        locality: locality.trim(),
        interests: parseCommaSeparatedList(interests),
        gender,
        orientationPreferences,
        relationshipIntention,
      },
      { onSuccess: onSaved },
    );
  }

  return {
    displayName,
    setDisplayName,
    bio,
    setBio,
    city,
    setCity,
    locality,
    setLocality,
    interests,
    setInterests,
    gender,
    setGender,
    orientationPreferences,
    toggleOrientationPreference,
    relationshipIntention,
    setRelationshipIntention,
    save,
    isSaving: mutation.isPending,
    saveError: mutation.error ? getApiErrorMessage(mutation.error) : null,
  };
}
