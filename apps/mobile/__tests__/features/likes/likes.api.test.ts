import { remainingLikes, type LikeQuota } from '../../../src/features/likes/api/likes.api';

function quota(overrides: Partial<LikeQuota> = {}): LikeQuota {
  return { used: 0, limit: 20, resets_at: '2026-11-28T00:00:00.000Z', ...overrides };
}

describe('remainingLikes', () => {
  it('returns the difference between limit and used', () => {
    expect(remainingLikes(quota({ used: 5, limit: 20 }))).toBe(15);
  });

  it('returns 0 when the quota is fully used', () => {
    expect(remainingLikes(quota({ used: 20, limit: 20 }))).toBe(0);
  });

  it('never returns a negative number, even if used exceeds limit', () => {
    expect(remainingLikes(quota({ used: 25, limit: 20 }))).toBe(0);
  });
});
