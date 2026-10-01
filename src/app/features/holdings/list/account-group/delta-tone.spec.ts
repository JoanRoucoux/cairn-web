import { deltaTone, isMissing } from './delta-tone';

describe('deltaTone', () => {
  it.each([
    [12, 'text-(--positive)'],
    [-3, 'text-(--negative)'],
    [0, 'text-(--muted-foreground)'],
    [null, 'text-(--subtle-foreground)'],
    [undefined, 'text-(--subtle-foreground)'],
  ])('maps %s to %s', (value, tone) => {
    expect(deltaTone(value)).toBe(tone);
  });

  it('tells a missing value from a zero', () => {
    expect(isMissing(null)).toBe(true);
    expect(isMissing(undefined)).toBe(true);
    expect(isMissing(0)).toBe(false);
  });
});
