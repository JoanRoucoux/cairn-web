import type { AssetClass } from '@core/api-client/cairnAPI.schemas';

export const SLUG_BY_CLASS: Record<AssetClass, string> = {
  ETF: 'etf',
  FUND: 'fonds',
  EQUITY: 'actions',
  CRYPTO: 'crypto',
  BOND: 'obligations',
  OTHER: 'autre',
  CASH: 'liquidites',
};
