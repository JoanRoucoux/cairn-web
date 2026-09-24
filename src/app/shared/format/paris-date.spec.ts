import { parisDateString, parisTimeString } from './paris-date';

describe('parisDateString', () => {
  it('should give the Paris calendar date for an instant still in the previous UTC day', () => {
    expect(parisDateString(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16');
  });
});

describe('parisTimeString', () => {
  it('should format the wall-clock time in Paris summer time (UTC+2)', () => {
    expect(parisTimeString('2026-08-21T16:32:00Z')).toBe('18:32');
  });

  it('should format the wall-clock time in Paris winter time (UTC+1)', () => {
    expect(parisTimeString('2026-01-15T09:05:00Z')).toBe('10:05');
  });
});
