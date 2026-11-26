import { generateCorrelationId } from '../../src/core/correlationId';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateCorrelationId', () => {
  it('returns a string matching the UUID v4 format', () => {
    expect(generateCorrelationId()).toMatch(UUID_V4_PATTERN);
  });

  it('returns a different id on each call', () => {
    const first = generateCorrelationId();
    const second = generateCorrelationId();

    expect(first).not.toEqual(second);
  });

  it('is a pure function that takes no arguments', () => {
    expect(generateCorrelationId.length).toBe(0);
  });
});
