import { chartFormats } from './chart-formats';

describe('chartFormats', () => {
  it('should format a value in euros with two decimals', () => {
    const { value } = chartFormats('fr-FR', false, '1m');

    expect(value(164294.28)).toBe('164\u202f294,28\u00a0\u20ac');
  });

  it('should format a signed delta with two decimals', () => {
    const { delta } = chartFormats('fr-FR', false, '1m');

    expect(delta(-240.72)).toMatch(/^−/);
  });

  it('should mask the value behind four bullets and no digit', () => {
    const { value } = chartFormats('fr-FR', true, '1m');

    expect(value(164294.28)).toContain('••••');
    expect(value(164294.28)).not.toMatch(/\d/);
  });

  it('should mask the delta behind four bullets and no digit', () => {
    const { delta } = chartFormats('fr-FR', true, '1m');

    expect(delta(-240.72)).toContain('••••');
    expect(delta(-240.72)).not.toMatch(/\d/);
  });

  it('should show an hour for the one-day range', () => {
    const { axis } = chartFormats('en-GB', false, '1d');

    expect(axis(Date.UTC(2026, 7, 25, 9, 0))).toMatch(/^\d{1,2}/);
  });

  it('should show a bare hour in French, which already carries its own unit', () => {
    const { axis } = chartFormats('fr-FR', false, '1d');

    expect(axis(Date.UTC(2026, 7, 25, 9, 0))).toMatch(/^\d{1,2}\s?h$/);
  });

  it('should show a day and a month for a range beyond one day', () => {
    const { axis } = chartFormats('en-GB', false, '1m');

    expect(axis(Date.UTC(2026, 7, 25, 9, 0))).toMatch(/[A-Za-z]/);
  });
});
