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

  const at = Date.UTC(2026, 8, 25, 7, 0);

  it.each([
    ['fr-FR', '1d', '09:00'],
    ['fr-FR', '7d', 'ven. 25'],
    ['fr-FR', '1m', '25 sept.'],
    ['fr-FR', '1y', 'sept.'],
    ['fr-FR', '5y', '2026'],
    ['fr-FR', 'max', '2026'],
    ['en-GB', '1d', '09:00'],
    ['en-GB', '7d', 'Fri 25'],
    ['en-GB', '1m', '25 Sept'],
    ['en-GB', '1y', 'Sept'],
    ['en-GB', '5y', '2026'],
    ['en-GB', 'max', '2026'],
  ] as const)('should label the %s %s axis like the mockup', (locale, range, expected) => {
    expect(chartFormats(locale, false, range).axis(at)).toBe(expected);
  });
});
