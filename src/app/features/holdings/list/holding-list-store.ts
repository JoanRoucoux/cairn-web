import { Injectable, computed, inject, signal } from '@angular/core';
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
  unvaluedCount: number;
  stale: boolean;
  holdings: HoldingResponse[];
};

const matches = (holding: HoldingResponse, search: string): boolean =>
  normalizeSearch(`${holding.instrumentName} ${holding.isin ?? ''}`).includes(search);

export const isBooklet = (holding: HoldingResponse): boolean => holding.assetClass === 'CASH';

@Injectable()
export class HoldingListStore {
  #holdingsApiClient = inject(HoldingService);
  #accountsApiClient = inject(AccountService);
  #route = inject(ActivatedRoute);

  readonly search = signal('');

  readonly #queryParamMap = toSignal(this.#route.queryParamMap);

  readonly staleFilter = computed(() => this.#queryParamMap()?.get('filter') === 'stale');
  readonly addParam = computed(() => this.#queryParamMap()?.get('add') ?? null);
  readonly accountFilter = computed(() => this.#queryParamMap()?.get('account') ?? null);
  readonly assetClassFilter = computed(() => (this.#queryParamMap()?.get('assetClass') as AssetClass | null) ?? null);

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

  readonly #filtered = computed(() => {
    let positions = this.#allHoldings().filter((holding) => !holding.accountCash);

    if (this.staleFilter()) {
      positions = positions.filter((holding) => holding.stale);
    }

    const assetClass = this.assetClassFilter();

    return assetClass ? positions.filter((holding) => holding.assetClass === assetClass) : positions;
  });

  readonly groups = computed<AccountGroup[]>(() => {
    const byAccount = new Map<string, AccountGroup>();
    const cashByAccount = this.#cashByAccount();
    const search = normalizeSearch(this.search().trim());
    const searching = search !== '';
    const newGroup = (accountId: string, accountName: string, accountType: string): AccountGroup => ({
      accountId,
      accountName,
      accountType,
      institution: this.#institutionByAccount().get(accountId) ?? '',
      valueEur: cashByAccount.get(accountId)?.amount ?? 0,
      cashEur: cashByAccount.get(accountId)?.amount ?? 0,
      showCash: !searching && (accountType !== 'SAVINGS' || cashByAccount.has(accountId)),
      lineCount: 0,
      bookletCount: 0,
      unvaluedCount: 0,
      stale: false,
      holdings: [],
    });

    for (const holding of this.#filtered()) {
      const group =
        byAccount.get(holding.accountId) ?? newGroup(holding.accountId, holding.accountName, holding.accountType);

      if (holding.marketValueEur === null || holding.marketValueEur === undefined) {
        group.unvaluedCount += 1;
      } else {
        group.valueEur += holding.marketValueEur;
      }

      if (isBooklet(holding)) {
        group.bookletCount += 1;
      } else {
        group.lineCount += 1;
      }

      group.stale = group.stale || holding.stale;

      if (!searching || matches(holding, search)) {
        group.holdings.push(holding);
      }

      byAccount.set(holding.accountId, group);
    }

    if (!searching && !this.staleFilter() && !this.assetClassFilter()) {
      for (const [accountId, info] of cashByAccount) {
        if (!byAccount.has(accountId)) {
          byAccount.set(accountId, newGroup(accountId, info.accountName, info.accountType));
        }
      }
    }

    const order = new Map(this.#accountList().map((account, index) => [account.id, index]));
    const rank = (group: AccountGroup): number => order.get(group.accountId) ?? Number.MAX_SAFE_INTEGER;
    const account = this.accountFilter();
    const groups = [...byAccount.values()]
      .filter((group) => !searching || group.holdings.length > 0)
      .map((group) => ({ ...group, valueEur: Number(group.valueEur.toFixed(2)) }))
      .sort((left, right) => rank(left) - rank(right));

    return account ? groups.filter((group) => group.accountName === account) : groups;
  });
}
