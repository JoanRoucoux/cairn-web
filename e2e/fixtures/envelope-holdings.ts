// Five more envelopes beyond the PEA account api.ts already carries (with its stale and unvalued
// holdings), so the portfolio screen has a realistic full set: PEE ~107,700, CTO ~33,300,
// SAVINGS ~20,000 cash only, PER ~9,300, LIFE_INSURANCE ~9,100.

const BASE = {
  priceCurrency: 'EUR',
  priceAsOf: '2026-08-27T18:00:00Z',
  priceSource: 'YAHOO',
  stale: false,
  assetClass: 'ETF',
};

export const peeHolding = {
  ...BASE,
  id: '44444444-4444-4444-4444-444444444444',
  accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
  accountName: 'PEE Amundi',
  accountType: 'PEE',
  instrumentId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  instrumentName: 'Amundi Label Employe Diversifie',
  isin: 'FR0013234598',
  quantity: 718,
  averageCost: 132.4,
  price: 150,
  marketValueEur: 107_700,
  unrealizedGainEur: 12_640.8,
  unrealizedGainRatio: 0.133,
  dayChangeEur: 190,
  dayChangeRatio: 0.0018,
};

export const ctoHolding = {
  ...BASE,
  id: '55555555-5555-5555-5555-555555555555',
  accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
  accountName: 'CTO Boursorama',
  accountType: 'CTO',
  instrumentId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
  instrumentName: 'iShares Core MSCI World',
  isin: 'IE00B4L5Y983',
  quantity: 370,
  averageCost: 82.1,
  price: 90,
  marketValueEur: 33_300,
  unrealizedGainEur: 2_923,
  unrealizedGainRatio: 0.096,
  dayChangeEur: 58.2,
  dayChangeRatio: 0.0018,
};

export const savingsHolding = {
  ...BASE,
  id: '66666666-6666-6666-6666-666666666666',
  accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad',
  accountName: 'Livret A',
  accountType: 'SAVINGS',
  instrumentId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
  instrumentName: 'Livret A cash',
  isin: null,
  assetClass: 'CASH',
  quantity: 20_000,
  averageCost: 1,
  price: 1,
  priceSource: 'MANUAL',
  marketValueEur: 20_000,
  unrealizedGainEur: 0,
  unrealizedGainRatio: 0,
  dayChangeEur: 0,
  dayChangeRatio: 0,
};

export const perHolding = {
  ...BASE,
  id: '77777777-7777-7777-7777-777777777777',
  accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae',
  accountName: 'PER Linxea',
  accountType: 'PER',
  instrumentId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
  instrumentName: 'Amundi PER Croissance',
  isin: 'FR0013412283',
  quantity: 465,
  averageCost: 18.2,
  price: 20,
  marketValueEur: 9_300,
  unrealizedGainEur: 837,
  unrealizedGainRatio: 0.099,
  dayChangeEur: 15.4,
  dayChangeRatio: 0.0017,
};

export const lifeInsuranceHolding = {
  ...BASE,
  id: '88888888-8888-8888-8888-888888888888',
  accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaf',
  accountName: 'Assurance-vie Boursorama',
  accountType: 'LIFE_INSURANCE',
  instrumentId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6',
  instrumentName: 'Fonds Euro Boursorama Vie',
  isin: 'FR0013455260',
  quantity: 9_100,
  averageCost: 0.95,
  price: 1,
  marketValueEur: 9_100,
  unrealizedGainEur: 455,
  unrealizedGainRatio: 0.05,
  dayChangeEur: 10,
  dayChangeRatio: 0.0011,
};

export const EXTRA_HOLDINGS = [peeHolding, ctoHolding, savingsHolding, perHolding, lifeInsuranceHolding];

const institutionOf = (holding: (typeof EXTRA_HOLDINGS)[number]): string =>
  holding === peeHolding ? 'Amundi' : holding === perHolding ? 'Linxea' : 'Boursorama';

export const EXTRA_ACCOUNTS = EXTRA_HOLDINGS.map((holding) => ({
  id: holding.accountId,
  name: holding.accountName,
  type: holding.accountType,
  institution: institutionOf(holding),
}));

type PeaHolding = { accountType: string; marketValueEur: number; dayChangeEur: number };

// The PEA envelope combines api.ts's normal and stale holdings into one row, matching how the
// `byEnvelope` API response aggregates by `AccountType` rather than by holding.
export const buildEnvelopes = (
  pea: PeaHolding,
  staleHolding: PeaHolding,
): { accountType: string; valueEur: number; changeEur: number; changeRatio: number }[] => [
  {
    accountType: pea.accountType,
    valueEur: pea.marketValueEur + staleHolding.marketValueEur,
    changeEur: pea.dayChangeEur + staleHolding.dayChangeEur,
    changeRatio: 0.0018,
  },
  {
    accountType: peeHolding.accountType,
    valueEur: peeHolding.marketValueEur,
    changeEur: peeHolding.dayChangeEur,
    changeRatio: peeHolding.dayChangeRatio,
  },
  {
    accountType: ctoHolding.accountType,
    valueEur: ctoHolding.marketValueEur,
    changeEur: ctoHolding.dayChangeEur,
    changeRatio: ctoHolding.dayChangeRatio,
  },
  {
    accountType: savingsHolding.accountType,
    valueEur: savingsHolding.marketValueEur,
    changeEur: savingsHolding.dayChangeEur,
    changeRatio: 0,
  },
  {
    accountType: perHolding.accountType,
    valueEur: perHolding.marketValueEur,
    changeEur: perHolding.dayChangeEur,
    changeRatio: perHolding.dayChangeRatio,
  },
  {
    accountType: lifeInsuranceHolding.accountType,
    valueEur: lifeInsuranceHolding.marketValueEur,
    changeEur: lifeInsuranceHolding.dayChangeEur,
    changeRatio: lifeInsuranceHolding.dayChangeRatio,
  },
];
