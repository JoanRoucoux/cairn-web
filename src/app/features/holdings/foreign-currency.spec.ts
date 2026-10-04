import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { foreignCurrencyOf } from './foreign-currency';

const holding = (priceCurrency: string | null | undefined): HoldingResponse => ({ priceCurrency }) as HoldingResponse;

describe('foreignCurrencyOf', () => {
  it('returns the quote currency when it is not the euro', () => {
    expect(foreignCurrencyOf(holding('USD'))).toBe('USD');
  });

  it.each(['EUR', null, undefined, ''])('returns nothing for %s', (currency) => {
    expect(foreignCurrencyOf(holding(currency))).toBeUndefined();
  });
});
