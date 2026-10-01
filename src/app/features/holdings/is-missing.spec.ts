import { isMissing } from './is-missing';

describe('isMissing', () => {
  it('tells a missing value from a zero', () => {
    expect(isMissing(null)).toBe(true);
    expect(isMissing(undefined)).toBe(true);
    expect(isMissing(0)).toBe(false);
  });
});
