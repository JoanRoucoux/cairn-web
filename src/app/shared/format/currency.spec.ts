import { isForeignCurrency } from './currency';

describe('isForeignCurrency', () => {
  it('should flag a currency other than EUR', () => {
    expect(isForeignCurrency('USD')).toBe(true);
  });

  it('should not flag EUR', () => {
    expect(isForeignCurrency('EUR')).toBe(false);
  });

  it('should not flag a missing currency', () => {
    expect(isForeignCurrency(null)).toBe(false);
    expect(isForeignCurrency(undefined)).toBe(false);
  });
});
