import type { Route } from '@playwright/test';

type Handler = (route: Route, match: RegExpExecArray) => Promise<void>;

type TradableHolding = {
  id: string;
  assetClass: string;
  quantity: number;
  averageCost: number | null;
  price: number | null;
  marketValueEur: number | null;
};

const resolveCandidate = {
  name: 'iShares Core MSCI World UCITS ETF',
  source: 'YAHOO',
  sourceRef: 'IWDA.AS',
  assetClass: 'ETF',
  exchange: 'Euronext Amsterdam',
  probePrice: 97.91,
  currency: 'EUR',
};

export const USD_HOLDING_ISIN = 'US46090E1038';

const usdHoldingListings = [
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

export const resolveInstrument: Handler = (route) => {
  const { query } = route.request().postDataJSON() as { query: string };
  const normalized = query.trim().toLowerCase();

  if (normalized === 'nonexistent') {
    return route.fulfill({ json: [] });
  }

  return route.fulfill({
    json: normalized === USD_HOLDING_ISIN.toLowerCase() ? usdHoldingListings : [resolveCandidate],
  });
};

type MovableHolding = TradableHolding & {
  accountId: string;
  instrumentId: string;
  instrumentName: string;
  priceCurrency: string;
};

type Listing = { id: string; name: string };

export const changeHoldingInstrument =
  (holdings: MovableHolding[], instruments: () => Listing[]): Handler =>
  (route, [, id]) => {
    const holding = holdings.find((candidate) => candidate.id === id);
    const { instrumentId } = route.request().postDataJSON() as { instrumentId: string };
    const target = instruments().find((candidate) => candidate.id === instrumentId);

    if (!holding || !target) {
      return route.fulfill({ status: 404, json: { message: 'unknown holding or instrument' } });
    }

    if (
      holdings.some((candidate) => candidate.accountId === holding.accountId && candidate.instrumentId === instrumentId)
    ) {
      return route.fulfill({ status: 422, json: { message: 'the account already holds this instrument' } });
    }

    Object.assign(holding, {
      instrumentId,
      instrumentName: target.name,
      priceCurrency: 'EUR',
      price: 412.3,
      marketValueEur: holding.quantity * 412.3,
    });

    return route.fulfill({ json: holding });
  };

export const buyHolding =
  (holdings: TradableHolding[]): Handler =>
  (route, [, id]) => {
    const holding = holdings.find((candidate) => candidate.id === id);

    if (!holding) {
      return route.fulfill({ status: 404, json: { message: `unknown holding: ${id}` } });
    }

    if (holding.assetClass === 'CASH') {
      return route.fulfill({ status: 422, json: { message: 'cash holdings cannot be bought' } });
    }

    const { quantity, unitPrice } = route.request().postDataJSON() as { quantity: number; unitPrice: number };
    const newQuantity = holding.quantity + quantity;

    holding.averageCost =
      holding.averageCost === null
        ? unitPrice
        : (holding.quantity * holding.averageCost + quantity * unitPrice) / newQuantity;
    holding.quantity = newQuantity;
    holding.marketValueEur = newQuantity * (holding.price ?? unitPrice);

    return route.fulfill({ json: holding });
  };

export const sellHolding =
  (holdings: TradableHolding[]): Handler =>
  (route, [, id]) => {
    const index = holdings.findIndex((candidate) => candidate.id === id);

    if (index === -1) {
      return route.fulfill({ status: 404, json: { message: `unknown holding: ${id}` } });
    }

    const holding = holdings[index]!;

    if (holding.assetClass === 'CASH') {
      return route.fulfill({ status: 422, json: { message: 'cash holdings cannot be sold' } });
    }

    const { quantity } = route.request().postDataJSON() as { quantity: number };

    if (quantity > holding.quantity) {
      return route.fulfill({ status: 422, json: { message: 'quantity exceeds the held amount' } });
    }

    if (quantity === holding.quantity) {
      holdings.splice(index, 1);

      return route.fulfill({ status: 204 });
    }

    holding.quantity -= quantity;
    holding.marketValueEur = holding.quantity * (holding.price ?? 0);

    return route.fulfill({ json: holding });
  };
