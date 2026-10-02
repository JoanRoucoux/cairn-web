import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { AccountService } from '@core/api-client/account/account.service';
import type { AssetClass, HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';

import { normalizeSearch } from '@shared/format/normalize-search';

export type AccountGroup = {
  accountId: string;
  accountName: string;
  accountType: string;
  institution: string;
  valueEur: number;
  cashEur: number;
  showCash: boolean;
  lineCount: number;
  bookletCount: number;
  holdings: HoldingResponse[];
  filtered: { accountValueEur: number; rowCount: number } | null;
};

export type ClassCounts = { total: number; byClass: Record<AssetClass, number> };

export type ClassSummary = { valueEur: number; share: number; accounts: number };

export const CLASS_ORDER: readonly AssetClass[] = ['ETF', 'FUND', 'EQUITY', 'CRYPTO', 'CASH'];

export const SLUG_BY_CLASS: Record<AssetClass, string> = {
  ETF: 'etf',
  FUND: 'fonds',
  EQUITY: 'actions',
  CRYPTO: 'crypto',
  CASH: 'liquidites',
};

const CLASS_BY_SLUG = new Map<string, AssetClass>(
  Object.entries(SLUG_BY_CLASS).map(([assetClass, slug]) => [slug, assetClass as AssetClass]),
);

const matches = (holding: HoldingResponse, search: string): boolean =>
  holding.assetClass !== 'CASH' &&
  normalizeSearch(`${holding.instrumentName} ${holding.isin ?? ''} ${holding.symbol ?? ''}`).includes(search);

const round = (value: number): number => Number(value.toFixed(2));

export const isBooklet = (holding: HoldingResponse): boolean => holding.assetClass === 'CASH';

@Injectable()
export class HoldingListStore {
  #holdingsApiClient = inject(HoldingService);
  #accountsApiClient = inject(AccountService);
  #route = inject(ActivatedRoute);

  readonly search = signal('');

  readonly #queryParamMap = toSignal(this.#route.queryParamMap);

  readonly addParam = computed(() => this.#queryParamMap()?.get('add') ?? null);

  readonly accountParam = computed(() => this.#queryParamMap()?.get('compte') ?? null);

  readonly assetClass = linkedSignal<AssetClass | null>(
    () => CLASS_BY_SLUG.get(this.#queryParamMap()?.get('classe') ?? '') ?? null,
  );

  readonly holdings = rxResource({
    stream: () => this.#holdingsApiClient.listHoldings(),
    defaultValue: [],
  });

  readonly accounts = rxResource({
    stream: () => this.#accountsApiClient.listAccounts(),
    defaultValue: [],
  });

  readonly #accountList = computed(() => (this.accounts.hasValue() ? this.accounts.value() : []));

  readonly #institutionByAccount = computed(
    () => new Map(this.#accountList().map((account) => [account.id, account.institution.trim()])),
  );

  readonly #allHoldings = computed(() => (this.holdings.hasValue() ? this.holdings.value() : []));

  readonly #cashByAccount = computed(() => {
    const cash = new Map<string, { accountName: string; accountType: string; amount: number }>();

    for (const holding of this.#allHoldings()) {
      if (holding.accountCash) {
        cash.set(holding.accountId, {
          accountName: holding.accountName,
          accountType: holding.accountType,
          amount: holding.quantity,
        });
      }
    }

    return cash;
  });

  readonly #positions = computed(() => this.#allHoldings().filter((holding) => !holding.accountCash));

  readonly #allGroups = computed<AccountGroup[]>(() => {
    const byAccount = new Map<string, AccountGroup>();
    const cashByAccount = this.#cashByAccount();
    const newGroup = (accountId: string, accountName: string, accountType: string): AccountGroup => ({
      accountId,
      accountName,
      accountType,
      institution: this.#institutionByAccount().get(accountId) ?? '',
      valueEur: cashByAccount.get(accountId)?.amount ?? 0,
      cashEur: cashByAccount.get(accountId)?.amount ?? 0,
      showCash: accountType !== 'SAVINGS' || cashByAccount.has(accountId),
      lineCount: 0,
      bookletCount: 0,
      holdings: [],
      filtered: null,
    });

    for (const holding of this.#positions()) {
      const group =
        byAccount.get(holding.accountId) ?? newGroup(holding.accountId, holding.accountName, holding.accountType);

      group.valueEur += holding.marketValueEur ?? 0;

      if (isBooklet(holding)) {
        group.bookletCount += 1;
      } else {
        group.lineCount += 1;
      }

      group.holdings.push(holding);
      byAccount.set(holding.accountId, group);
    }

    for (const [accountId, info] of cashByAccount) {
      if (!byAccount.has(accountId)) {
        byAccount.set(accountId, newGroup(accountId, info.accountName, info.accountType));
      }
    }

    const order = new Map(this.#accountList().map((account, index) => [account.id, index]));
    const rank = (group: AccountGroup): number => order.get(group.accountId) ?? Number.MAX_SAFE_INTEGER;

    return [...byAccount.values()]
      .map((group) => ({ ...group, valueEur: round(group.valueEur) }))
      .sort((left, right) => rank(left) - rank(right));
  });

  readonly classCounts = computed<ClassCounts>(() => {
    const byClass: Record<AssetClass, number> = { ETF: 0, FUND: 0, EQUITY: 0, CRYPTO: 0, CASH: 0 };
    let total = 0;

    for (const group of this.#allGroups()) {
      const cashRow = group.showCash ? 1 : 0;

      total += group.holdings.length + cashRow;
      byClass.CASH += cashRow;

      for (const holding of group.holdings) {
        byClass[holding.assetClass] += 1;
      }
    }

    return { total, byClass };
  });

  readonly groups = computed<AccountGroup[]>(() => {
    const search = normalizeSearch(this.search().trim());
    const assetClass = this.assetClass();
    const all = this.#allGroups();

    if (search === '' && assetClass === null) {
      return all;
    }

    return all
      .map((group): AccountGroup => {
        const holdings = group.holdings.filter(
          (holding) =>
            (search === '' || matches(holding, search)) && (assetClass === null || holding.assetClass === assetClass),
        );
        const showCash = search === '' && group.showCash && (assetClass === null || assetClass === 'CASH');

        if (assetClass === null) {
          return { ...group, holdings, showCash };
        }

        const valueEur =
          holdings.reduce((sum, holding) => sum + (holding.marketValueEur ?? 0), 0) + (showCash ? group.cashEur : 0);

        return {
          ...group,
          holdings,
          showCash,
          valueEur: round(valueEur),
          filtered: { accountValueEur: group.valueEur, rowCount: holdings.length + (showCash ? 1 : 0) },
        };
      })
      .filter((group) => group.holdings.length > 0 || group.showCash);
  });

  readonly classSummary = computed<ClassSummary | null>(() => {
    if (this.assetClass() === null) {
      return null;
    }

    const wealth = this.#allGroups().reduce((sum, group) => sum + group.valueEur, 0);
    const groups = this.groups();
    const valueEur = round(groups.reduce((sum, group) => sum + group.valueEur, 0));

    return { valueEur, share: wealth === 0 ? 0 : valueEur / wealth, accounts: groups.length };
  });
}
