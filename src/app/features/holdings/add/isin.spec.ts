import { isinOf } from './isin';

describe('isinOf', () => {
  it('recognises a real ISIN, trimmed and upper-cased', () => {
    expect(isinOf('  ie00b4l5y983 ')).toBe('IE00B4L5Y983');
  });

  it('rejects a name, a symbol and a malformed code', () => {
    expect(isinOf('msci world')).toBeNull();
    expect(isinOf('EUNL.DE')).toBeNull();
    expect(isinOf('IE00B4L5Y98')).toBeNull();
    expect(isinOf('IE00B4L5Y98X')).toBeNull();
  });
});
