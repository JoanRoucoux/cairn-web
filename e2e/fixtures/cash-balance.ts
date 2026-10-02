import type { Route } from '@playwright/test';

type Handler = (route: Route, match: RegExpExecArray) => Promise<void>;

type CashHolding = { accountId: string; accountCash: boolean; quantity: number; marketValueEur: number | null };
type Owner = { id: string; name: string; type: string };

export const setCashBalance =
  <T extends CashHolding>(holdings: T[], accounts: Owner[], template: T): Handler =>
  (route, [, accountId]) => {
    const { amount } = route.request().postDataJSON() as { amount: number };

    if (amount < 0) {
      return route.fulfill({ status: 422, json: { message: 'amount must not be negative' } });
    }

    const owner = accounts.find((candidate) => candidate.id === accountId);
    const savings = owner?.type === 'SAVINGS';
    const index = holdings.findIndex((candidate) => candidate.accountId === accountId && candidate.accountCash);
    const updatedAt = new Date().toISOString();

    if (amount === 0 && !savings && index !== -1) {
      holdings.splice(index, 1);
    } else if (index !== -1 && (amount > 0 || savings)) {
      holdings[index] = { ...holdings[index]!, quantity: amount, marketValueEur: amount, updatedAt };
    } else if (amount > 0 || savings) {
      holdings.push({
        ...template,
        accountId,
        accountName: owner?.name ?? 'Unknown account',
        accountType: owner?.type ?? 'PEA',
        quantity: amount,
        marketValueEur: amount,
        updatedAt,
      });
    }

    return route.fulfill({ status: 204 });
  };
