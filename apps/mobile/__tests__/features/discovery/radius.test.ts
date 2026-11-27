import {
  DEFAULT_RADIUS,
  RADIUS_OPTIONS,
  formatRadiusLabel,
  radiusToQueryParam,
  resolveEffectiveRadius,
  resolveRadiusPickerDisabledReason,
} from '../../../src/features/discovery/radius';

describe('RADIUS_OPTIONS', () => {
  it('is exactly the fixed tier set the backend accepts', () => {
    expect(RADIUS_OPTIONS).toEqual([1, 3, 5, 10, 25, 50, 100, 'any']);
  });
});

describe('resolveEffectiveRadius (locked-vs-unlocked state logic)', () => {
  it('returns the selected radius for a Premium user', () => {
    expect(resolveEffectiveRadius(true, 10)).toBe(10);
    expect(resolveEffectiveRadius(true, 'any')).toBe('any');
    expect(resolveEffectiveRadius(true, 100)).toBe(100);
  });

  it('always falls back to "any" for a non-Premium user, regardless of what was selected', () => {
    expect(resolveEffectiveRadius(false, 10)).toBe(DEFAULT_RADIUS);
    expect(resolveEffectiveRadius(false, 1)).toBe(DEFAULT_RADIUS);
    expect(resolveEffectiveRadius(false, 'any')).toBe(DEFAULT_RADIUS);
  });

  it('still resolves to "any" for a formerly-Premium user whose selection predates losing entitlement', () => {
    // Simulates a subscription expiring after the user had picked a tight radius.
    expect(resolveEffectiveRadius(false, 3)).toBe('any');
  });
});

describe('resolveRadiusPickerDisabledReason (locked-state-reason logic)', () => {
  it('returns "not_premium" for a non-Premium user, regardless of location permission', () => {
    expect(resolveRadiusPickerDisabledReason(false, false)).toBe('not_premium');
    expect(resolveRadiusPickerDisabledReason(false, true)).toBe('not_premium');
  });

  it('returns "location_denied" for a Premium user who denied (or never granted) location permission', () => {
    expect(resolveRadiusPickerDisabledReason(true, true)).toBe('location_denied');
  });

  it('returns null (fully unlocked) for a Premium user who granted location permission', () => {
    expect(resolveRadiusPickerDisabledReason(true, false)).toBeNull();
  });

  it('never conflates the two locked states: "not_premium" always wins over location status', () => {
    expect(resolveRadiusPickerDisabledReason(false, false)).not.toBe('location_denied');
  });
});

describe('radiusToQueryParam', () => {
  it('stringifies a numeric tier', () => {
    expect(radiusToQueryParam(25)).toBe('25');
  });

  it('passes "any" through unchanged', () => {
    expect(radiusToQueryParam('any')).toBe('any');
  });
});

describe('formatRadiusLabel', () => {
  it('appends "km" to a numeric tier', () => {
    expect(formatRadiusLabel(50)).toBe('50 km');
  });

  it('capitalizes "any"', () => {
    expect(formatRadiusLabel('any')).toBe('Any');
  });
});
