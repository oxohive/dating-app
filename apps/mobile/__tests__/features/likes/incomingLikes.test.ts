import { describeIncomingLikesTeaser, mapIncomingLikesResponse } from '../../../src/features/likes/api/likes.api';

describe('mapIncomingLikesResponse (is_premium/count/likes wire-shape mapping)', () => {
  it('maps the free (non-premium) response to a count-only result, with an empty likers list', () => {
    expect(mapIncomingLikesResponse({ is_premium: false, count: 3, likes: [] })).toEqual({
      isPremium: false,
      count: 3,
      likers: [],
    });
  });

  it('maps a zero-count free response the same way (no special-casing)', () => {
    expect(mapIncomingLikesResponse({ is_premium: false, count: 0, likes: [] })).toEqual({
      isPremium: false,
      count: 0,
      likers: [],
    });
  });

  it('maps the Premium response to the full liker list, converting each profile to camelCase', () => {
    const result = mapIncomingLikesResponse({
      is_premium: true,
      count: 1,
      likes: [
        {
          profile: { id: 'profile-1', display_name: 'Alex', photo_url: 'https://example.com/a.jpg' },
          liked_at: '2026-11-20T10:00:00.000Z',
        },
      ],
    });

    expect(result).toEqual({
      isPremium: true,
      count: 1,
      likers: [
        {
          profile: {
            id: 'profile-1',
            displayName: 'Alex',
            photoUrl: 'https://example.com/a.jpg',
          },
          likedAt: '2026-11-20T10:00:00.000Z',
        },
      ],
    });
  });

  it('passes through a null photo_url as-is (no default substitution)', () => {
    const result = mapIncomingLikesResponse({
      is_premium: true,
      count: 1,
      likes: [{ profile: { id: 'profile-2', display_name: 'Sam', photo_url: null }, liked_at: '2026-11-21T00:00:00.000Z' }],
    });

    const [liker] = result.likers;
    expect(liker.profile.photoUrl).toBeNull();
  });

  it('returns an empty list, not an error, when a Premium user has no incoming likes yet', () => {
    expect(mapIncomingLikesResponse({ is_premium: true, count: 0, likes: [] })).toEqual({
      isPremium: true,
      count: 0,
      likers: [],
    });
  });
});

describe('describeIncomingLikesTeaser', () => {
  it('singularizes "person" for exactly one liker', () => {
    expect(describeIncomingLikesTeaser(1)).toBe('1 person liked you — upgrade to see who.');
  });

  it('pluralizes "people" for more than one liker', () => {
    expect(describeIncomingLikesTeaser(5)).toBe('5 people liked you — upgrade to see who.');
  });

  it('returns a distinct message for zero likers, with no upgrade pitch', () => {
    expect(describeIncomingLikesTeaser(0)).toBe('No one has liked you yet.');
  });
});
