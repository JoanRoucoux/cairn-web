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

  describe('axis labels on a short history', () => {
    const day = 86_400_000;
    const days = (count: number): number[] =>
      Array.from({ length: count }, (_, index) => Date.UTC(2026, 8, 20) + index * day);

    it.each(['5y', 'max'] as const)('should not repeat the year on the %s axis', (range) => {
      const times = days(5);
      const { axis } = chartFormats('fr-FR', false, range, times);

      expect(times.map(axis)).toEqual(['2026', '', '', '', '']);
    });

    it('should not repeat a month on the 1y axis of a longer series', () => {
      const times = days(40);
      const { axis } = chartFormats('en-GB', false, '1y', times);

      expect([0, 10, 20, 29, 39].map((index) => axis(times[index] as number))).toEqual(['Sept', '', 'Oct', '', '']);
    });

    it('should keep every label when they all differ', () => {
      const times = [Date.UTC(2022, 0, 1), Date.UTC(2023, 0, 1), Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1)];
      const { axis } = chartFormats('fr-FR', false, '5y', times);

      expect(times.map(axis)).toEqual(['2022', '2023', '2024', '2025']);
    });

    it('should format a time that is not a tick as is', () => {
      const { axis } = chartFormats('fr-FR', false, '5y', days(10));

      expect(axis(at)).toBe('2026');
    });
  });
});
