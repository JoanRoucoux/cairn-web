import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { foreignCurrencyOf, listingQueryOf } from './foreign-currency';

const holding = (priceCurrency: string | null | undefined): HoldingResponse => ({ priceCurrency }) as HoldingResponse;

describe('foreignCurrencyOf', () => {
  it('returns the quote currency when it is not the euro', () => {
    expect(foreignCurrencyOf(holding('USD'))).toBe('USD');
  });

  it.each(['EUR', null, undefined, ''])('returns nothing for %s', (currency) => {
    expect(foreignCurrencyOf(holding(currency))).toBeUndefined();
  });
});

describe('listingQueryOf', () => {
  it('searches the ISIN, then the symbol, then the name', () => {
    const named = { instrumentName: 'Bitcoin' } as HoldingResponse;

    expect(listingQueryOf({ ...named, isin: 'IE00B4L5Y983', symbol: 'IWDA' })).toBe('IE00B4L5Y983');
    expect(listingQueryOf({ ...named, isin: null, symbol: 'BTC' })).toBe('BTC');
    expect(listingQueryOf({ ...named, isin: null, symbol: null })).toBe('Bitcoin');
  });
});
