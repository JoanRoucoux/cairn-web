import { decimalPlaces } from './decimal-places';

describe('decimalPlaces', () => {
  it('counts zero decimals for a whole number', () => {
    expect(decimalPlaces(676)).toBe(0);
  });

  it('counts the decimals a value actually carries', () => {
    expect(decimalPlaces(412.5)).toBe(1);
  });

  it('caps at six decimals', () => {
    expect(decimalPlaces(0.123456789)).toBe(6);
  });

  it('ignores the sign', () => {
    expect(decimalPlaces(-412.5)).toBe(1);
  });
});
