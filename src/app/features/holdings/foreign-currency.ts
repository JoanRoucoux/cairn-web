import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

export const foreignCurrencyOf = (holding: HoldingResponse): string | undefined =>
  holding.priceCurrency && holding.priceCurrency !== 'EUR' ? holding.priceCurrency : undefined;
