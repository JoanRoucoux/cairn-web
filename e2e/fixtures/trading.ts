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
};

export const resolveInstrument: Handler = (route) => {
  const { query } = route.request().postDataJSON() as { query: string };

  return route.fulfill({ json: query.trim().toLowerCase() === 'nonexistent' ? [] : [resolveCandidate] });
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
