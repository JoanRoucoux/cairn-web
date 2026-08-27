import { CHART_RANGES, rangeStart } from './chart-range';

const now = new Date('2026-08-21T20:00:00Z');

describe('rangeStart', () => {
  it('should offer six ranges', () => {
    expect(CHART_RANGES).toHaveLength(6);
  });

  it('should look back one day', () => {
    expect(rangeStart('1d', now)).toBe('2026-08-20');
  });

  it('should look back a month', () => {
    expect(rangeStart('1m', now)).toBe('2026-07-21');
  });

  it('should return undefined for the whole history', () => {
    expect(rangeStart('max', now)).toBeUndefined();
  });
});
