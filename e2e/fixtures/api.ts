import type { Page, Route } from '@playwright/test';

// No `cairn-api` backend runs in this environment: every screen's /api/** calls are served
// fixed JSON here instead, so the suite is self-contained in CI and locally.

const holding = {
  id: '11111111-1111-1111-1111-111111111111',
  accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  accountName: 'PEA Boursorama',
  accountType: 'PEA',
  instrumentId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  instrumentName: 'Amundi MSCI World',
  isin: 'FR0010756098',
  assetClass: 'ETF',
  quantity: 12,
  averageCost: 380.5,
  price: 410.2,
  priceCurrency: 'EUR',
  priceAsOf: '2026-08-27T18:00:00Z',
  priceSource: 'YAHOO',
  stale: false,
  marketValueEur: 4922.4,
  unrealizedGainEur: 495.6,
  unrealizedGainRatio: 0.108,
  dayChangeEur: 12.3,
  dayChangeRatio: 0.0025,
};

const staleHolding = {
  ...holding,
  id: '22222222-2222-2222-2222-222222222222',
  instrumentName: 'Bitcoin',
  assetClass: 'CRYPTO',
  priceSource: 'COINGECKO',
  stale: true,
  averageCost: null,
  unrealizedGainEur: null,
  unrealizedGainRatio: null,
};

const holdings = [holding, staleHolding];

const account = {
  id: holding.accountId,
  name: holding.accountName,
  type: holding.accountType,
  institution: 'Boursorama',
};

const accounts = [account];

const instrument = {
  id: holding.instrumentId,
  name: holding.instrumentName,
  isin: holding.isin,
  currency: 'EUR',
  assetClass: holding.assetClass,
  priceSource: holding.priceSource,
  sourceRef: 'AMUNDI-MSCI-WORLD',
};

const instruments = [instrument];

const portfolio = {
  totalEur: 9844.8,
  dayChangeEur: 24.6,
  dayChangeRatio: 0.0025,
  unrealizedGainEur: 495.6,
  unrealizedGainRatio: 0.108,
  staleCount: 1,
  generatedAt: '2026-08-27T18:00:00Z',
  byAssetClass: [
    { label: 'ETF', valueEur: 4922.4, share: 0.5 },
    { label: 'CRYPTO', valueEur: 4922.4, share: 0.5 },
  ],
  byAccount: [{ label: account.name, valueEur: 4922.4, share: 0.5 }],
  holdings,
};

const history = {
  mode: 'constant-mix',
  reconstructed: false,
  points: [
    { date: '2026-08-20', totalEur: 9700 },
    { date: '2026-08-27', totalEur: 9844.8 },
  ],
};

const jobRuns = [
  {
    id: 1,
    jobName: 'quote-refresh',
    status: 'COMPLETED',
    startedAt: '2026-08-27T06:00:00Z',
    endedAt: '2026-08-27T06:01:00Z',
  },
];

const session = {
  displayName: 'Joan Roucoux',
  initials: 'JR',
  passkeys: [
    { credentialId: 'aXBob25l', label: 'iPhone de Joan', createdAt: '2026-02-01T10:00:00Z', lastUsedAt: null },
  ],
};

const refreshReport = { refreshed: 2, skipped: 0, failures: [] };

const FIXED_RESPONSES: Record<string, unknown> = {
  'GET /api/portfolio': portfolio,
  'GET /api/history': history,
  'GET /api/holdings': holdings,
  'GET /api/accounts': accounts,
  'POST /api/accounts': account,
  'GET /api/instruments': instruments,
  'GET /api/jobs/runs': jobRuns,
  'POST /api/quotes/refresh': refreshReport,
  'GET /api/session': session,
};

const handleApiRoute = async (route: Route): Promise<void> => {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();

  if (url.pathname.startsWith('/api/session/passkeys/') && method === 'DELETE') {
    return route.fulfill({ status: 204 });
  }

  const body = FIXED_RESPONSES[`${method} ${url.pathname}`];

  if (body !== undefined) {
    return route.fulfill({ json: body });
  }

  return route.fulfill({ status: 404, json: { message: `unmocked route: ${method} ${url.pathname}` } });
};

export const mockApi = async (page: Page): Promise<void> => {
  await page.route('**/api/**', handleApiRoute);
};
