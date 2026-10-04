import type { Route } from '@playwright/test';

export const USD_HOLDING_ISIN = 'US46090E1038';

export const SHARED_ISIN = 'LU1681043599';

type Candidate = {
  name: string;
  source: string;
  sourceRef: string;
  assetClass: string;
  isin?: string | null;
  symbol?: string | null;
  exchange?: string | null;
  probePrice?: number | null;
  probeAsOf?: string | null;
  currency?: string | null;
  trackedInstrumentId?: string | null;
};

const iSharesWorld: Candidate = {
  name: 'iShares Core MSCI World UCITS ETF',
  source: 'YAHOO',
  sourceRef: 'IWDA.AS',
  symbol: 'IWDA.AS',
  assetClass: 'ETF',
  exchange: 'Euronext Amsterdam',
  probePrice: 97.91,
  currency: 'EUR',
};

const nasdaqListings: Candidate[] = [
  {
    name: 'Nasdaq 100 UCITS ETF',
    source: 'YAHOO',
    sourceRef: 'EQQQ.DE',
    assetClass: 'ETF',
    isin: USD_HOLDING_ISIN,
    exchange: 'Xetra',
    probePrice: 412.3,
    currency: 'EUR',
  },
  {
    name: 'Nasdaq 100 UCITS ETF USD',
    source: 'YAHOO',
    sourceRef: 'EQQQ.L',
    assetClass: 'ETF',
    isin: USD_HOLDING_ISIN,
    exchange: 'London Stock Exchange',
    probePrice: 480.1,
    currency: 'USD',
  },
];

const sharedIsinAtYahoo: Candidate = {
  name: 'Northwind World Equity UCITS ETF',
  source: 'YAHOO',
  sourceRef: 'NWWE.PA',
  symbol: 'NWWE.PA',
  assetClass: 'ETF',
  isin: SHARED_ISIN,
  exchange: 'Paris',
  probePrice: 528.31,
  currency: 'EUR',
};

const sharedIsinAtAmundi: Candidate = {
  name: 'Northwind World Equity Fund',
  source: 'AMUNDI',
  sourceRef: SHARED_ISIN,
  assetClass: 'FUND',
  isin: SHARED_ISIN,
  probePrice: 527.9,
  probeAsOf: '2026-09-24',
  currency: 'EUR',
};

const solana: Candidate = {
  name: 'Solana',
  source: 'COINGECKO',
  sourceRef: 'solana',
  symbol: 'SOL',
  assetClass: 'CRYPTO',
  probePrice: 142.18,
  probeAsOf: '2026-09-25',
  currency: 'EUR',
};

export const buildSearchHandler =
  (trackedMsciWorld: Candidate) =>
  (route: Route): Promise<void> => {
    const params = new URL(route.request().url()).searchParams;
    const query = (params.get('query') ?? '').trim().toLowerCase();

    switch (params.get('source')) {
      case 'YAHOO':
        if (query === USD_HOLDING_ISIN.toLowerCase()) {
          return route.fulfill({ json: nasdaqListings });
        }

        if (query === SHARED_ISIN.toLowerCase()) {
          return route.fulfill({ json: [sharedIsinAtYahoo] });
        }

        return route.fulfill({ json: query.includes('msci') ? [iSharesWorld, trackedMsciWorld] : [] });
      case 'COINGECKO':
        return route.fulfill({ json: query === 'solana' ? [solana] : [] });
      default:
        return route.fulfill({ json: query === SHARED_ISIN.toLowerCase() ? [sharedIsinAtAmundi] : [] });
    }
  };
