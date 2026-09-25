import { pluralKey } from './plural-key';

describe('pluralKey', () => {
  it('should use the singular suffix for a count of one', () => {
    expect(pluralKey('portfolio.stale.message', 1)).toBe('portfolio.stale.message_one');
  });

  it('should use the plural suffix for any other count', () => {
    expect(pluralKey('portfolio.stale.message', 2)).toBe('portfolio.stale.message_other');
    expect(pluralKey('portfolio.stale.message', 0)).toBe('portfolio.stale.message_other');
  });
});
