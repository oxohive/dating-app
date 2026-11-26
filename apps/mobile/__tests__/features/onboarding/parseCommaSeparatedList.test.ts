import { parseCommaSeparatedList } from '../../../src/features/onboarding/utils/parseCommaSeparatedList';

describe('parseCommaSeparatedList', () => {
  it('splits and trims a comma-separated string', () => {
    expect(parseCommaSeparatedList('hiking, jazz,  cooking')).toEqual(['hiking', 'jazz', 'cooking']);
  });

  it('drops empty entries caused by trailing/double commas', () => {
    expect(parseCommaSeparatedList('hiking,,jazz,')).toEqual(['hiking', 'jazz']);
  });

  it('returns an empty array for blank input', () => {
    expect(parseCommaSeparatedList('')).toEqual([]);
    expect(parseCommaSeparatedList('   ')).toEqual([]);
  });
});
