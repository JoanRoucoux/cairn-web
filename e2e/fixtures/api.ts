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

const holdings = [holding, staleHolding, unvaluedHolding];

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
  description: 'A physically-replicated ETF tracking the MSCI World index across developed markets.',
  externalUrl: 'https://www.amundietf.com/en/professional/product/view/LU1681043599',
  holdingCount: 1,
};

const unvaluedInstrument = {
  id: unvaluedHolding.instrumentId,
  name: unvaluedHolding.instrumentName,
  isin: null,
  currency: 'EUR',
  assetClass: unvaluedHolding.assetClass,
  priceSource: unvaluedHolding.priceSource,
  sourceRef: 'NEWLY-LISTED-FUND',
  description: 'A fund awaiting its first quote.',
  externalUrl: null,
  holdingCount: 1,
};

// Not part of `instruments`: it backs a holding used for one screen only, and must not shift the
// count the instruments list asserts on.
const instruments = [instrument];

let created = 0;

const portfolio = {
  totalEur: 9844.8,
  dayChangeEur: 24.6,
  dayChangeRatio: 0.0025,
  unrealizedGainEur: 495.6,
  unrealizedGainRatio: 0.108,
  staleCount: 1,
  unvaluedCount: 1,
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

const refreshReport = {
  refreshed: 2,
  skipped: 0,
  failures: [{ instrumentId: instrument.id, instrumentName: instrument.name, source: 'YAHOO', message: 'timeout' }],
};

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

// Browser-valid base64url: WebAuthn parses these into ArrayBuffers before the virtual
// authenticator ever sees them.
const base64url = (value: string): string =>
  Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');

const authenticationOptions = {
  challenge: base64url('authenticate-challenge'),
  rpId: 'localhost',
  timeout: 60000,
  userVerification: 'required',
  allowCredentials: [],
};

const registrationOptions = {
  rp: { id: 'localhost', name: 'Cairn' },
  user: {
    id: base64url('e2e-owner'),
    name: 'joan',
    displayName: 'Joan Roucoux',
  },
  challenge: base64url('register-challenge'),
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  timeout: 60000,
  attestation: 'none',
  authenticatorSelection: {
    residentKey: 'required',
    userVerification: 'required',
  },
};

const authenticateWebauthn: Handler = async (route) => {
  await route.fulfill({ json: authenticationOptions });
};

const loginWebauthn: Handler = async (route) => {
  await route.fulfill({ json: { authenticated: true, redirectUrl: '/' } });
};

const registerWebauthnOptions: Handler = async (route) => {
  await route.fulfill({ json: registrationOptions });
};

// Stateful on purpose: the account screen reloads the session after registering, and the new
// passkey has to show up in the list it re-reads.
const registerWebauthn: Handler = async (route) => {
  session.passkeys.push({
    credentialId: base64url('new-passkey'),
    label:
      ((route.request().postDataJSON() as { publicKey?: { label?: string } }).publicKey?.label as string) ??
      'New passkey',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  });

  await route.fulfill({ json: { success: true } });
};

const WEBAUTHN_ROUTES: { method: string; path: RegExp; handle: Handler }[] = [
  { method: 'POST', path: new RegExp('^/webauthn/authenticate/options$'), handle: authenticateWebauthn },
  { method: 'POST', path: new RegExp('^/login/webauthn$'), handle: loginWebauthn },
  { method: 'POST', path: new RegExp('^/webauthn/register/options$'), handle: registerWebauthnOptions },
  { method: 'POST', path: new RegExp('^/webauthn/register$'), handle: registerWebauthn },
];

const handleWebauthnRoute = async (route: Route): Promise<void> => {
  const request = route.request();
  const { pathname } = new URL(request.url());
  const method = request.method();

  for (const { method: expected, path, handle } of WEBAUTHN_ROUTES) {
    if (method === expected && path.test(pathname)) {
      return handle(route, [] as unknown as RegExpExecArray);
    }
  }

  return route.fulfill({ status: 404, json: { message: `unmocked route: ${method} ${pathname}` } });
};

export const mockApi = async (page: Page): Promise<void> => {
  await page.route('**/api/**', handleApiRoute);
  await page.route('**/webauthn/**', handleWebauthnRoute);
  await page.route('**/login/webauthn', handleWebauthnRoute);
};
