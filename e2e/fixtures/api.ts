import type { Page, Route } from '@playwright/test';

import { EXTRA_ACCOUNTS, EXTRA_HOLDINGS, buildEnvelopes } from './envelope-holdings';
import { instrument as buildInstrument, unvaluedInstrument as buildUnvaluedInstrument } from './instruments';
import { buildPerformanceFixtures, buildTrendSeries } from './performance';
import { summarizeByAccount, totalsOf } from './portfolio-summary';
import { getSession, mockWebauthn } from './webauthn';

// No `cairn-api` backend runs in this environment: every screen's /api/** calls are served
// fixed JSON here instead, so the suite is self-contained in CI and locally.

// PEA ~88,200 (this holding plus the stale one below); the other 5 envelopes live in
// ./envelope-holdings.ts, summing with this one to the portfolio total.
const holding = {
  id: '11111111-1111-1111-1111-111111111111',
  accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  accountName: 'PEA Boursorama',
  accountType: 'PEA',
  instrumentId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  instrumentName: 'Amundi MSCI World',
  isin: 'FR0010756098',
  assetClass: 'ETF',
  quantity: 203,
  averageCost: 380.5,
  price: 410.2,
  priceCurrency: 'EUR',
  priceAsOf: '2026-08-27T18:00:00Z',
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
  instrumentName: 'Bitcoin',
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

// The PEA account's own EUR cash line: part of the PEA envelope, and never a day move.
const cashHolding = {
  ...holding,
  id: '44444444-4444-4444-4444-444444444444',
  instrumentId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  instrumentName: 'Euros',
  isin: null,
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

const holdings = [holding, staleHolding, unvaluedHolding, cashHolding, ...EXTRA_HOLDINGS];

const account = {
  id: holding.accountId,
  name: holding.accountName,
  type: holding.accountType,
  institution: 'Boursorama',
};

const accounts = [account, ...EXTRA_ACCOUNTS];

const instrument = buildInstrument(holding);
const unvaluedInstrument = buildUnvaluedInstrument(unvaluedHolding);

// Not part of `instruments`: it backs a holding used for one screen only, and must not shift the
// count the instruments list asserts on.
const instruments = [instrument];

let created = 0;

const { totalEur, dayChangeEur, unrealizedGainEur } = totalsOf(holdings);
// Every holding is assetClass ETF except the stale one (CRYPTO) and the SAVINGS envelope (CASH).
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
  generatedAt: '2026-08-27T18:00:00Z',
  byAssetClass: [
    { label: 'ETF', valueEur: etfEur, share: etfEur / totalEur },
    { label: 'CRYPTO', valueEur: staleHolding.marketValueEur, share: staleHolding.marketValueEur / totalEur },
    { label: 'CASH', valueEur: cashEur, share: cashEur / totalEur },
  ],
  byAccount: summarizeByAccount(holdings, accounts, totalEur),
  holdings,
};

// Irregular, not a smooth climb: a portfolio has down days too. Same trend-plus-random-walk shape
// as the intraday fixture (`buildTrendSeries`), pinned to end exactly on `totalEur`.
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

const jobRuns = [
  {
    id: 1,
    jobName: 'quote-refresh',
    status: 'COMPLETED',
    startedAt: '2026-08-27T06:00:00Z',
    endedAt: '2026-08-27T06:01:00Z',
  },
];

const refreshReport = {
  refreshed: 2,
  skipped: 0,
  failures: [{ instrumentId: instrument.id, instrumentName: instrument.name, source: 'YAHOO', message: 'timeout' }],
};

const FIXED_RESPONSES: Record<string, unknown> = {
  'GET /api/portfolio': portfolio,
  'GET /api/portfolio/performance': performance,
  'GET /api/history': history,
  'GET /api/history/intraday': intradayHistory,
  'GET /api/holdings': holdings,
  'GET /api/accounts': accounts,
  'POST /api/accounts': account,
  'GET /api/instruments': instruments,
  'GET /api/jobs/runs': jobRuns,
  'POST /api/quotes/refresh': refreshReport,
  'GET /api/session': getSession(),
};

type Handler = (route: Route, match: RegExpExecArray) => Promise<void>;

const allInstruments = (): typeof instruments => [...instruments, unvaluedInstrument];

const deletePasskey: Handler = (route) => route.fulfill({ status: 204 });

const getInstrument: Handler = (route, [, id]) => {
  const found = allInstruments().find((candidate) => candidate.id === id);

  return found
    ? route.fulfill({ json: found })
    : route.fulfill({ status: 404, json: { message: `unknown instrument: ${id}` } });
};

const listQuotes: Handler = (route) => route.fulfill({ json: [] });

// Stateful on purpose: a quote recorded for a newly created cash instrument must value it.
const recordQuote: Handler = (route, [, instrumentId]) =>
  route.fulfill({ status: 201, json: { instrumentId, ...(route.request().postDataJSON() as object) } });

// Stateful on purpose: a holding is unique per account and instrument, and a duplicate is refused.
const createHolding: Handler = (route) => {
  const body = route.request().postDataJSON() as {
    accountId: string;
    instrumentId: string;
    quantity: number;
    averageCost?: number | null;
  };
  const duplicate = holdings.some(
    (candidate) => candidate.accountId === body.accountId && candidate.instrumentId === body.instrumentId,
  );

  if (duplicate) {
    return route.fulfill({
      status: 409,
      json: { message: 'a holding already exists for this account and instrument' },
    });
  }

  const owningAccount = accounts.find((candidate) => candidate.id === body.accountId);
  const owningInstrument = allInstruments().find((candidate) => candidate.id === body.instrumentId);
  const saved = {
    id: `55555555-5555-5555-5555-00000000000${holdings.length + 1}`,
    accountId: body.accountId,
    accountName: owningAccount?.name ?? 'Unknown account',
    accountType: owningAccount?.type ?? 'PEA',
    instrumentId: body.instrumentId,
    instrumentName: owningInstrument?.name ?? 'Unknown instrument',
    isin: owningInstrument?.isin ?? null,
    assetClass: owningInstrument?.assetClass ?? 'CASH',
    quantity: body.quantity,
    averageCost: body.averageCost ?? null,
    price: 1,
    priceCurrency: 'EUR',
    priceAsOf: new Date().toISOString(),
    priceSource: owningInstrument?.priceSource ?? 'MANUAL',
    stale: false,
    marketValueEur: body.quantity,
    unrealizedGainEur: 0,
    unrealizedGainRatio: 0,
    dayChangeEur: 0,
    dayChangeRatio: 0,
  };
  holdings.push(saved);

  return route.fulfill({ status: 201, json: saved });
};

// Stateful on purpose: setting the balance again must show the new amount, and 0 must clear the line.
const setCashBalance: Handler = (route, [, accountId]) => {
  const { amount } = route.request().postDataJSON() as { amount: number };

  if (amount < 0) {
    return route.fulfill({ status: 422, json: { message: 'amount must not be negative' } });
  }

  const index = holdings.findIndex(
    (candidate) =>
      candidate.accountId === accountId && candidate.assetClass === 'CASH' && candidate.priceSource === 'MANUAL',
  );

  if (amount === 0 && index !== -1) {
    holdings.splice(index, 1);
  } else if (amount > 0 && index !== -1) {
    holdings[index] = { ...holdings[index]!, quantity: amount, marketValueEur: amount };
  } else if (amount > 0) {
    const owningAccount = accounts.find((candidate) => candidate.id === accountId);
    holdings.push({
      ...cashHolding,
      accountId,
      accountName: owningAccount?.name ?? 'Unknown account',
      accountType: owningAccount?.type ?? 'PEA',
      quantity: amount,
      marketValueEur: amount,
    });
  }

  return route.fulfill({ status: 204 });
};

// Stateful on purpose: a created instrument has to show up in the list that follows.
const createInstrument: Handler = (route) => {
  const saved = {
    ...instrument,
    ...route.request().postDataJSON(),
    id: `cccccccc-cccc-cccc-cccc-00000000000${++created}`,
  };
  instruments.push(saved);

  return route.fulfill({ status: 201, json: saved });
};

// Stateful on purpose: an edited instrument has to show up updated in the list that follows.
const updateInstrument: Handler = (route, [, id]) => {
  const existing = instruments.find((candidate) => candidate.id === id);

  if (!existing) {
    return route.fulfill({ status: 404, json: { message: `unknown instrument: ${id}` } });
  }

  Object.assign(existing, route.request().postDataJSON());

  return route.fulfill({ json: existing });
};

// Stateful on purpose: a deleted instrument, and the holdings it backs, must disappear.
const deleteInstrument: Handler = (route, [, id]) => {
  const index = instruments.findIndex((candidate) => candidate.id === id);

  if (index === -1) {
    return route.fulfill({ status: 404, json: { message: `unknown instrument: ${id}` } });
  }

  instruments.splice(index, 1);
  holdings
    .filter((candidate) => candidate.instrumentId === id)
    .forEach((candidate) => holdings.splice(holdings.indexOf(candidate), 1));

  return route.fulfill({ status: 204 });
};

// First match wins, so a more specific path must come before a broader one.
const ROUTES: { method: string; path: RegExp; handle: Handler }[] = [
  { method: 'DELETE', path: new RegExp('^/api/session/passkeys/.+$'), handle: deletePasskey },
  { method: 'GET', path: new RegExp('^/api/instruments/([^/]+)/quotes$'), handle: listQuotes },
  { method: 'POST', path: new RegExp('^/api/instruments/([^/]+)/quotes$'), handle: recordQuote },
  { method: 'GET', path: new RegExp('^/api/instruments/([^/]+)$'), handle: getInstrument },
  { method: 'PUT', path: new RegExp('^/api/instruments/([^/]+)$'), handle: updateInstrument },
  { method: 'DELETE', path: new RegExp('^/api/instruments/([^/]+)$'), handle: deleteInstrument },
  { method: 'POST', path: new RegExp('^/api/instruments$'), handle: createInstrument },
  { method: 'POST', path: new RegExp('^/api/holdings$'), handle: createHolding },
  { method: 'PUT', path: new RegExp('^/api/accounts/([^/]+)/cash$'), handle: setCashBalance },
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

export const mockApi = async (page: Page): Promise<void> => {
  await page.route('**/api/**', handleApiRoute);
  await mockWebauthn(page);
};
