import { parisDateString } from './paris-date';

describe('parisDateString', () => {
  it('should give the Paris calendar date for an instant still in the previous UTC day', () => {
    expect(parisDateString(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16');
  });
});
