import type { Route } from '@playwright/test';

type AccountFixture = { id: string; name: string; type: string; institution: string };
type HoldingFixture = { id: string; accountId: string; accountCash: boolean };

type Handler = (route: Route, match: RegExpExecArray) => Promise<void>;

export const buildAccountCrudHandlers = (
  accounts: AccountFixture[],
  holdings: HoldingFixture[],
): { createAccount: Handler; updateAccount: Handler; deleteAccount: Handler } => {
  let created = 0;

  const createAccount: Handler = (route) => {
    const saved = { ...route.request().postDataJSON(), id: `99999999-9999-9999-9999-00000000000${++created}` };
    accounts.push(saved);

    return route.fulfill({ status: 201, json: saved });
  };

  const updateAccount: Handler = (route, [, id]) => {
    const existing = accounts.find((candidate) => candidate.id === id);

    if (!existing) {
      return route.fulfill({ status: 404, json: { message: `unknown account: ${id}` } });
    }

    const body = route.request().postDataJSON() as { name: string; type: string; institution: string };
    const duplicate = accounts.some((candidate) => candidate.id !== id && candidate.name === body.name);

    if (duplicate) {
      return route.fulfill({ status: 409, json: { title: 'Conflict', detail: 'an account already has this name' } });
    }

    Object.assign(existing, body);

    return route.fulfill({ json: existing });
  };

  const deleteAccount: Handler = (route, [, id]) => {
    const index = accounts.findIndex((candidate) => candidate.id === id);

    if (index === -1) {
      return route.fulfill({ status: 404, json: { message: `unknown account: ${id}` } });
    }

    const ownHoldings = holdings.filter((candidate) => candidate.accountId === id);
    const nonCashCount = ownHoldings.filter((candidate) => !candidate.accountCash).length;

    if (nonCashCount > 0) {
      return route.fulfill({
        status: 422,
        json: { title: 'Unprocessable Entity', detail: `this account still holds ${nonCashCount} holdings` },
      });
    }

    accounts.splice(index, 1);
    ownHoldings.forEach((candidate) => holdings.splice(holdings.indexOf(candidate), 1));

    return route.fulfill({ status: 204 });
  };

  return { createAccount, updateAccount, deleteAccount };
};
