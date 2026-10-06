import type { Page, Route } from '@playwright/test';

import { buildAccountCrudHandlers } from './account-crud';
import { buildAllocationFixtures } from './allocation';
import { setCashBalance } from './cash-balance';
import { EXTRA_ACCOUNTS, EXTRA_HOLDINGS, buildEnvelopes } from './envelope-holdings';
import { buildUsdHolding } from './non-eur-holding';
import { buildPerformanceFixtures, buildTrendSeries } from './performance';
import { summarizeByAccount, totalsOf } from './portfolio-summary';
import { buildSearchHandler } from './search';
import { buyHolding, sellHolding, updateHolding } from './trading';
import { getPasskeys, getSession, mockWebauthn } from './webauthn';

const holding = {
  accountCash: false,
  id: '11111111-1111-1111-1111-111111111111',
  accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  accountName: 'Northwind PEA',
  accountType: 'PEA',
  instrumentId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  instrumentName: 'Amundi MSCI World',
  isin: 'FR0010756098' as string | null,
  symbol: 'CW8.PA' as string | null,
  sourceRef: 'CW8.PA' as string | null,
  description: 'A physically-replicated ETF tracking the MSCI World index across developed markets.' as string | null,
  externalUrl: 'https://www.amundietf.com/en/professional/product/view/LU1681043599' as string | null,
  assetClass: 'ETF',
  quantity: 203,
  averageCost: 380.5,
  price: 410.2,
  priceCurrency: 'EUR',
  priceAsOf: '2026-08-27T18:00:00Z',
  updatedAt: '2026-08-27T18:00:00Z',
  priceSource: 'YAHOO',
  stale: false,
  marketValueEur: 83_277.6,
  unrealizedGainEur: 6_500.5,
  unrealizedGainRatio: 0.085,
  dayChangeEur: 142.8,
  dayChangeRatio: 0.0017,
};

const staleHolding = {
  ...holding,
  id: '22222222-2222-2222-2222-222222222222',
  instrumentId: 'abababab-abab-abab-abab-abababababab',
  instrumentName: 'Bitcoin',
  isin: null,
  symbol: 'BTC',
  sourceRef: 'bitcoin',
  description: null,
  externalUrl: 'https://www.coingecko.com/en/coins/bitcoin',
  assetClass: 'CRYPTO',
  priceSource: 'COINGECKO',
  stale: true,
  averageCost: null,
  marketValueEur: 4_922.4,
  unrealizedGainEur: null,
  unrealizedGainRatio: null,
  dayChangeEur: 12.3,
  dayChangeRatio: 0.0025,
};

const unvaluedHolding = {
  ...holding,
  id: '33333333-3333-3333-3333-333333333333',
  instrumentId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  instrumentName: 'Newly listed fund',
  symbol: null,
  sourceRef: 'NEWLY-LISTED-FUND',
  description: 'A fund awaiting its first quote.',
  externalUrl: null,
  assetClass: 'FUND',
  price: null,
  priceCurrency: null,
  priceAsOf: null,
  marketValueEur: null,
  unrealizedGainEur: null,
  unrealizedGainRatio: null,
  dayChangeEur: null,
  dayChangeRatio: null,
};

const cashHolding = {
  ...holding,
  accountCash: true,
  id: '44444444-4444-4444-4444-444444444444',
  instrumentId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  instrumentName: 'Euros',
  isin: null,
  symbol: null,
  sourceRef: null,
  description: null,
  externalUrl: null,
  assetClass: 'CASH',
  quantity: 732.4,
  averageCost: 1,
  price: 1,
  priceSource: 'MANUAL',
  marketValueEur: 732.4,
  unrealizedGainEur: 0,
  unrealizedGainRatio: 0,
  dayChangeEur: 0,
  dayChangeRatio: 0,
};

const usdHolding = buildUsdHolding(holding);

const holdings = [holding, staleHolding, unvaluedHolding, usdHolding, cashHolding, ...EXTRA_HOLDINGS];

const account = {
  id: holding.accountId,
  name: holding.accountName,
  type: holding.accountType,
  institution: 'Northwind Bank',
};

const accounts = [account, ...EXTRA_ACCOUNTS];

let created = 0;

const searchInstruments = buildSearchHandler({
  name: holding.instrumentName,
  source: 'YAHOO',
  sourceRef: 'CW8.PA',
  symbol: 'CW8.PA',
  assetClass: 'ETF',
  exchange: 'Paris',
  probePrice: holding.price,
  currency: 'EUR',
  trackedInstrumentId: holding.instrumentId,
});

const { totalEur, dayChangeEur, unrealizedGainEur } = totalsOf(holdings);
const cashEur = 20_000;
const etfEur = totalEur - staleHolding.marketValueEur - cashEur;

const portfolio = {
  totalEur,
  dayChangeEur,
  dayChangeRatio: dayChangeEur / (totalEur - dayChangeEur),
  unrealizedGainEur,
  unrealizedGainRatio: unrealizedGainEur / (totalEur - unrealizedGainEur),
  staleCount: 1,
  unvaluedCount: 1,
  nonEurCount: 1,
  generatedAt: '2026-08-27T18:00:00Z',
  byAssetClass: [
    { label: 'ETF', valueEur: etfEur, share: etfEur / totalEur },
    { label: 'CRYPTO', valueEur: staleHolding.marketValueEur, share: staleHolding.marketValueEur / totalEur },
    { label: 'CASH', valueEur: cashEur, share: cashEur / totalEur },
  ],
  byAccount: summarizeByAccount(holdings, accounts, totalEur),
  holdings,
};

const historyDates = [
  '2026-08-20',
  '2026-08-21',
  '2026-08-22',
  '2026-08-23',
  '2026-08-24',
  '2026-08-25',
  '2026-08-26',
  '2026-08-27',
];
const history = {
  mode: 'constant-mix',
  reconstructed: false,
  points: buildTrendSeries(263_000, totalEur, historyDates.length, 20_260_820).map((value, index) => ({
    date: historyDates[index],
    totalEur: value,
  })),
};

const { intradayHistory, performance } = buildPerformanceFixtures(
  portfolio,
  buildEnvelopes({ ...holding, marketValueEur: holding.marketValueEur + cashHolding.marketValueEur }, staleHolding),
);

const FIXED_RESPONSES: Record<string, unknown> = {
  'GET /api/portfolio': portfolio,
  'GET /api/portfolio/performance': performance,
  ...buildAllocationFixtures(portfolio, holdings, accounts),
  'GET /api/history': history,
  'GET /api/history/intraday': intradayHistory,
  'GET /api/holdings': holdings,
  'GET /api/accounts': accounts,
  'GET /api/session': getSession(),
  'GET /api/session/passkeys': getPasskeys(),
};

type Handler = (route: Route, match: RegExpExecArray) => Promise<void>;

const deletePasskey: Handler = (route) => route.fulfill({ status: 204 });

const quotePriceByInstrument: Record<string, number> = {
  [holding.instrumentId]: holding.price,
  [staleHolding.instrumentId]: staleHolding.price,
};

const listQuotes: Handler = (route, [, instrumentId]) => {
  const end = quotePriceByInstrument[instrumentId];

  if (end === undefined) {
    return route.fulfill({ json: [] });
  }

  const series = buildTrendSeries(end * 0.92, end, historyDates.length, 20_260_827);

  return route.fulfill({
    json: historyDates.map((date, index) => ({
      instrumentId,
      asOf: `${date}T18:00:00Z`,
      price: series[index],
      currency: 'EUR',
      source: 'YAHOO',
    })),
  });
};

const recordQuote: Handler = (route, [, instrumentId]) => {
  const quote = route.request().postDataJSON() as { asOf: string; price: number };

  for (const priced of holdings.filter((candidate) => candidate.instrumentId === instrumentId)) {
    Object.assign(priced, {
      price: quote.price,
      priceCurrency: 'EUR',
      priceAsOf: quote.asOf,
      marketValueEur: priced.quantity * quote.price,
    });
  }

  return route.fulfill({ status: 201, json: { instrumentId, ...quote } });
};

type NewInstrument = {
  name?: string;
  assetClass: string;
  priceSource: string;
  sourceRef?: string | null;
  isin?: string | null;
  symbol?: string | null;
  price?: number | null;
  currency?: string | null;
};

type CreateHoldingBody = {
  accountId: string;
  instrumentId?: string | null;
  instrument?: NewInstrument;
  quantity: number;
  averageCost?: number | null;
};

const titleFor = (body: CreateHoldingBody): Partial<(typeof holdings)[number]> | undefined => {
  if (body.instrumentId) {
    return holdings.find((candidate) => candidate.instrumentId === body.instrumentId);
  }

  const instrument = body.instrument!;
  const sourceRef = instrument.priceSource === 'MANUAL' ? null : (instrument.sourceRef ?? instrument.isin ?? null);
  const tracked = holdings.find(
    (candidate) =>
      sourceRef !== null && candidate.priceSource === instrument.priceSource && candidate.sourceRef === sourceRef,
  );

  if (tracked) {
    return tracked;
  }

  const sirius = instrument.priceSource === 'SG_SIRIUS';
  const price = instrument.priceSource === 'MANUAL' ? (instrument.price ?? null) : sirius ? null : 1;

  return {
    instrumentId: `cccccccc-cccc-cccc-cccc-00000000000${++created}`,
    instrumentName: sirius ? (instrument.isin ?? '') : (instrument.name ?? ''),
    isin: instrument.isin ?? null,
    symbol: instrument.symbol ?? null,
    sourceRef,
    assetClass: sirius ? 'FUND' : instrument.assetClass,
    priceSource: instrument.priceSource,
    price,
    priceCurrency: price === null ? null : 'EUR',
  };
};

const createHolding: Handler = (route) => {
  const body = route.request().postDataJSON() as CreateHoldingBody;
  const title = titleFor(body);

  if (!title) {
    return route.fulfill({ status: 404, json: { title: 'Resource not found' } });
  }

  const duplicate = holdings.some(
    (candidate) => candidate.accountId === body.accountId && candidate.instrumentId === title.instrumentId,
  );

  if (duplicate) {
    return route.fulfill({ status: 422, json: { title: 'Business rule violated' } });
  }

  const owningAccount = accounts.find((candidate) => candidate.id === body.accountId);
  const price = title.price ?? null;
  const saved = {
    id: `55555555-5555-5555-5555-00000000000${holdings.length + 1}`,
    accountId: body.accountId,
    accountName: owningAccount?.name ?? 'Unknown account',
    accountType: owningAccount?.type ?? 'PEA',
    instrumentId: title.instrumentId!,
    accountCash: false,
    instrumentName: title.instrumentName!,
    isin: title.isin ?? null,
    symbol: title.symbol ?? null,
    sourceRef: title.sourceRef ?? null,
    description: null,
    externalUrl: null,
    assetClass: title.assetClass!,
    quantity: body.quantity,
    averageCost: body.averageCost ?? null,
    price,
    priceCurrency: price === null ? null : 'EUR',
    priceAsOf: price === null ? null : new Date().toISOString(),
    priceSource: title.priceSource!,
    stale: false,
    marketValueEur: price === null ? null : body.quantity * price,
    unrealizedGainEur: 0,
    unrealizedGainRatio: 0,
    dayChangeEur: 0,
    dayChangeRatio: 0,
  };
  holdings.push(saved as (typeof holdings)[number]);

  return route.fulfill({ status: 201, json: saved });
};

const { createAccount, updateAccount, deleteAccount } = buildAccountCrudHandlers(accounts, holdings);

const setCashBalanceHandler: Handler = setCashBalance(holdings, accounts, cashHolding);

// First match wins, so a more specific path must come before a broader one.
const ROUTES: { method: string; path: RegExp; handle: Handler }[] = [
  { method: 'DELETE', path: new RegExp('^/api/session/passkeys/.+$'), handle: deletePasskey },
  { method: 'GET', path: new RegExp('^/api/instruments/([^/]+)/quotes$'), handle: listQuotes },
  { method: 'POST', path: new RegExp('^/api/instruments/([^/]+)/quotes$'), handle: recordQuote },
  { method: 'GET', path: new RegExp('^/api/instruments/search$'), handle: searchInstruments },
  { method: 'POST', path: new RegExp('^/api/holdings/([^/]+)/buy$'), handle: buyHolding(holdings) },
  { method: 'POST', path: new RegExp('^/api/holdings/([^/]+)/sell$'), handle: sellHolding(holdings) },
  { method: 'POST', path: new RegExp('^/api/holdings$'), handle: createHolding },
  { method: 'PATCH', path: new RegExp('^/api/holdings/([^/]+)$'), handle: updateHolding(holdings) },
  { method: 'PUT', path: new RegExp('^/api/accounts/([^/]+)/cash$'), handle: setCashBalanceHandler },
  { method: 'PUT', path: new RegExp('^/api/accounts/([^/]+)$'), handle: updateAccount },
  { method: 'DELETE', path: new RegExp('^/api/accounts/([^/]+)$'), handle: deleteAccount },
  { method: 'POST', path: new RegExp('^/api/accounts$'), handle: createAccount },
];

const handleApiRoute = async (route: Route): Promise<void> => {
  const request = route.request();
  const { pathname } = new URL(request.url());
  const method = request.method();

  for (const { method: expected, path, handle } of ROUTES) {
    const match = method === expected ? path.exec(pathname) : null;

    if (match) {
      return handle(route, match);
    }
  }

  const body = FIXED_RESPONSES[`${method} ${pathname}`];

  if (body !== undefined) {
    return route.fulfill({ json: body });
  }

  return route.fulfill({ status: 404, json: { message: `unmocked route: ${method} ${pathname}` } });
};

const initialState = structuredClone({ holdings, accounts });

const resetState = (): void => {
  const fresh = structuredClone(initialState);
  holdings.splice(0, holdings.length, ...fresh.holdings);
  accounts.splice(0, accounts.length, ...fresh.accounts);
  created = 0;
};

export const mockApi = async (page: Page): Promise<void> => {
  resetState();
  await page.route('**/api/**', handleApiRoute);
  await mockWebauthn(page);
};
