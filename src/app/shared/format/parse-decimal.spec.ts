import { filterDecimalInput, parseDecimal } from './parse-decimal';

describe('parseDecimal', () => {
  it('reads a comma as the decimal separator', () => {
    expect(parseDecimal('0,5')).toBe(0.5);
  });

  it('reads a dot as the decimal separator', () => {
    expect(parseDecimal('0.5')).toBe(0.5);
  });

  it('strips spaces used as thousand separators', () => {
    expect(parseDecimal('1 200')).toBe(1200);
  });

  it('strips non-breaking and narrow non-breaking spaces', () => {
    expect(parseDecimal('1 200,5')).toBe(1200.5);
    expect(parseDecimal('1 200,5')).toBe(1200.5);
  });

  it('returns null for an empty string', () => {
    expect(parseDecimal('')).toBeNull();
  });

  it('returns null for text with no number', () => {
    expect(parseDecimal('abc')).toBeNull();
  });
});

describe('filterDecimalInput', () => {
  it('keeps digits, commas, dots and spaces', () => {
    expect(filterDecimalInput('1 200,5')).toBe('1 200,5');
  });

  it('strips letters and other symbols', () => {
    expect(filterDecimalInput('12a3€b')).toBe('123');
  });
});
