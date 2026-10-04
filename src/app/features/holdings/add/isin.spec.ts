import { compactIsin, isIsin } from './isin';

describe('isin', () => {
  it('drops every space and upper-cases', () => {
    expect(compactIsin(' ie00 b4l5 y983 ')).toBe('IE00B4L5Y983');
  });

  it('recognises a real ISIN, spaces and case aside', () => {
    expect(isIsin('  ie00b4l5y983 ')).toBe(true);
    expect(isIsin('XS 2381 2345 67')).toBe(true);
  });

  it('rejects a name, a symbol and a malformed code', () => {
    expect(isIsin('msci world')).toBe(false);
    expect(isIsin('EUNL.DE')).toBe(false);
    expect(isIsin('IE00B4L5Y98')).toBe(false);
    expect(isIsin('IE00B4L5Y98X')).toBe(false);
    expect(isIsin('IE00B4L5Y9831')).toBe(false);
  });
});
