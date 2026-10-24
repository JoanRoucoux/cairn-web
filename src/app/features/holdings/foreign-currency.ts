import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { isForeignCurrency } from '@shared/format/currency';

export const foreignCurrencyOf = (holding: HoldingResponse): string | undefined =>
  isForeignCurrency(holding.priceCurrency) ? holding.priceCurrency : undefined;
