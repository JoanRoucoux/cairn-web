import { Injectable, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { AccountService } from '@core/api-client/account/account.service';
import type { AssetClass, HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';

import { excludedCounts } from '@shared/format/excluded-lines';
import { normalizeSearch } from '@shared/format/normalize-search';

import { type HoldingChange, HoldingChanges } from '../holding-changes';

export type AccountGroup = {
  key: string;
  accountId: string;
  accountName: string;
  accountType: string;
  institution: string;
  valueEur: number;
  cashEur: number;
  showCash: boolean;
  lineCount: number;
  balanceAt: string | null;
  unvaluedCount: number;
  nonEurCount: number;
  holdings: HoldingResponse[];
  filtered: { accountValueEur: number; rowCount: number } | null;
};

export type ClassCounts = { total: number; byClass: Record<AssetClass, number> };

export type ClassSummary = { valueEur: number; share: number; accounts: number };

export const CLASS_ORDER: readonly AssetClass[] = ['ETF', 'FUND', 'EQUITY', 'CRYPTO', 'BOND', 'OTHER', 'CASH'];

export const CLASSES_SHOWN_WHEN_HELD: readonly AssetClass[] = ['BOND', 'OTHER'];

export const SLUG_BY_CLASS: Record<AssetClass, string> = {
  ETF: 'etf',
  FUND: 'fonds',
  EQUITY: 'actions',
  CRYPTO: 'crypto',
  BOND: 'obligations',
  OTHER: 'autre',
  CASH: 'liquidites',
};

const CLASS_BY_SLUG = new Map<string, AssetClass>(
  Object.entries(SLUG_BY_CLASS).map(([assetClass, slug]) => [slug, assetClass as AssetClass]),
);

const matches = (holding: HoldingResponse, search: string): boolean =>
  holding.assetClass !== 'CASH' &&
  normalizeSearch(`${holding.instrumentName} ${holding.isin ?? ''} ${holding.symbol ?? ''}`).includes(search);

const round = (value: number): number => Number(value.toFixed(2));

@Injectable()
export class HoldingListStore {
  #holdingsApiClient = inject(HoldingService);
  #accountsApiClient = inject(AccountService);
  #route = inject(ActivatedRoute);
  #changes = inject(HoldingChanges);

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

  readonly filterKey = computed(() => `${this.search()}|${this.assetClass() ?? ''}`);

  readonly #flash = linkedSignal<string, HoldingChange | null>({ source: this.filterKey, computation: () => null });
  readonly flash = this.#flash.asReadonly();
  readonly #pendingFlash = signal<HoldingChange | null>(null);

  #changesSeen = false;
  #seenTouched: HoldingChange | null = null;

  constructor() {
    effect(() => {
      const touched = this.#changes.lastTouched();
      this.#changes.lastRemoved();

      if (this.#changesSeen) {
        untracked(() => {
          if (touched !== this.#seenTouched) {
            this.#pendingFlash.set(touched);
          }
          this.holdings.reload();
        });
      }

      this.#seenTouched = touched;
      this.#changesSeen = true;
    });

    effect(() => {
      const pending = this.#pendingFlash();
      const status = this.holdings.status();

      if (status === 'error') {
        untracked(() => {
          this.#pendingFlash.set(null);
          this.#flash.set(null);
        });
      } else if (pending && status === 'resolved' && this.#changes.lastRevealed() === pending) {
        untracked(() => {
          this.#flash.set(pending);
          this.#pendingFlash.set(null);
        });
      }
    });
  }

  readonly #accountList = computed(() => (this.accounts.hasValue() ? this.accounts.value() : []));

  readonly #institutionByAccount = computed(
    () => new Map(this.#accountList().map((account) => [account.id, account.institution.trim()])),
  );

  readonly #allHoldings = computed(() => (this.holdings.hasValue() ? this.holdings.value() : []));

  readonly #cashByAccount = computed(() => {
    const cash = new Map<string, { accountName: string; accountType: string; amount: number; updatedAt: string }>();

    for (const holding of this.#allHoldings()) {
      if (holding.accountCash) {
        cash.set(holding.accountId, {
          accountName: holding.accountName,
          accountType: holding.accountType,
          amount: holding.quantity,
          updatedAt: holding.updatedAt,
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
      key: accountId,
      accountId,
      accountName,
      accountType,
      institution: this.#institutionByAccount().get(accountId) ?? '',
      valueEur: cashByAccount.get(accountId)?.amount ?? 0,
      cashEur: cashByAccount.get(accountId)?.amount ?? 0,
      showCash: true,
      balanceAt: cashByAccount.get(accountId)?.updatedAt ?? null,
      lineCount: 0,
      unvaluedCount: 0,
      nonEurCount: 0,
      holdings: [],
      filtered: null,
    });

    for (const holding of this.#positions()) {
      const group =
        byAccount.get(holding.accountId) ?? newGroup(holding.accountId, holding.accountName, holding.accountType);

      group.valueEur += holding.marketValueEur ?? 0;

      group.lineCount += 1;

      group.holdings.push(holding);
      byAccount.set(holding.accountId, group);
    }

    for (const [accountId, info] of cashByAccount) {
      if (!byAccount.has(accountId)) {
        byAccount.set(accountId, newGroup(accountId, info.accountName, info.accountType));
      }
    }

    for (const account of this.#accountList()) {
      if (account.type === 'SAVINGS' && !byAccount.has(account.id)) {
        byAccount.set(account.id, newGroup(account.id, account.name, account.type));
      }
    }

    const order = new Map(this.#accountList().map((account, index) => [account.id, index]));
    const rank = (group: AccountGroup): number => order.get(group.accountId) ?? Number.MAX_SAFE_INTEGER;

    return [...byAccount.values()]
      .map((group) => ({ ...group, valueEur: round(group.valueEur), ...excludedCounts(group.holdings) }))
      .sort((left, right) => rank(left) - rank(right));
  });

  readonly classCounts = computed<ClassCounts>(() => {
    const byClass: Record<AssetClass, number> = {
      ETF: 0,
      FUND: 0,
      EQUITY: 0,
      CRYPTO: 0,
      BOND: 0,
      OTHER: 0,
      CASH: 0,
    };
    let total = 0;

    for (const group of this.#allGroups()) {
      total += group.holdings.length + 1;
      byClass.CASH += 1;

      for (const holding of group.holdings) {
        byClass[holding.assetClass] += 1;
      }
    }

    return { total, byClass };
  });

  readonly groups = computed<AccountGroup[]>(() => {
    const search = normalizeSearch(this.search().trim());
    const assetClass = this.assetClass();
    const filterKey = this.filterKey();
    const all = this.#allGroups().map((group) => ({ ...group, key: `${group.accountId}|${filterKey}` }));

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
