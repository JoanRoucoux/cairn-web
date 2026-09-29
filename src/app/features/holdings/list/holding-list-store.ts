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
  unvaluedCount: number;
  unrealizedGainEur: number | null;
  stale: boolean;
  holdings: HoldingResponse[];
};

const matches = (holding: HoldingResponse, search: string): boolean =>
  normalizeSearch(`${holding.instrumentName} ${holding.isin ?? ''}`).includes(search);

@Injectable()
export class HoldingListStore {
  #holdingsApiClient = inject(HoldingService);
  #accountsApiClient = inject(AccountService);
  #route = inject(ActivatedRoute);

  readonly search = signal('');

  readonly #queryParamMap = toSignal(this.#route.queryParamMap);

  readonly staleFilter = computed(() => this.#queryParamMap()?.get('filter') === 'stale');
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

  readonly #institutionByAccount = computed(
    () => new Map(this.accounts.value().map((account) => [account.id, account.institution])),
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

  readonly #visible = computed(() => {
    let positions = this.#allHoldings().filter((holding) => !holding.accountCash);

    if (this.staleFilter()) {
      positions = positions.filter((holding) => holding.stale);
    }

    const assetClass = this.assetClassFilter();

    if (assetClass) {
      positions = positions.filter((holding) => holding.assetClass === assetClass);
    }

    const search = normalizeSearch(this.search().trim());

    return search ? positions.filter((holding) => matches(holding, search)) : positions;
  });

  readonly groups = computed<AccountGroup[]>(() => {
    const byAccount = new Map<string, AccountGroup>();
    const cashByAccount = this.#cashByAccount();

    for (const holding of this.#visible()) {
      const group = byAccount.get(holding.accountId) ?? {
        accountId: holding.accountId,
        accountName: holding.accountName,
        accountType: holding.accountType,
        institution: this.#institutionByAccount().get(holding.accountId) ?? '',
        valueEur: 0,
        cashEur: cashByAccount.get(holding.accountId)?.amount ?? 0,
        unvaluedCount: 0,
        unrealizedGainEur: 0,
        stale: false,
        holdings: [],
      };

      if (holding.marketValueEur === null || holding.marketValueEur === undefined) {
        group.unvaluedCount += 1;
      } else {
        group.valueEur += holding.marketValueEur;
      }

      group.stale = group.stale || holding.stale;
      group.holdings.push(holding);

      // One line without a cost basis makes the whole subtotal unknown: summing the known
      // lines would print a number that answers no question.
      group.unrealizedGainEur =
        group.unrealizedGainEur === null ||
        holding.unrealizedGainEur === null ||
        holding.unrealizedGainEur === undefined
          ? null
          : group.unrealizedGainEur + holding.unrealizedGainEur;

      byAccount.set(holding.accountId, group);
    }

    const search = normalizeSearch(this.search().trim());

    if (!this.staleFilter() && !this.assetClassFilter()) {
      for (const [accountId, info] of cashByAccount) {
        if (byAccount.has(accountId) || (search && !normalizeSearch(info.accountName).includes(search))) {
          continue;
        }

        byAccount.set(accountId, {
          accountId,
          accountName: info.accountName,
          accountType: info.accountType,
          institution: this.#institutionByAccount().get(accountId) ?? '',
          valueEur: 0,
          cashEur: info.amount,
          unvaluedCount: 0,
          unrealizedGainEur: 0,
          stale: false,
          holdings: [],
        });
      }
    }

    const account = this.accountFilter();
    const groups = [...byAccount.values()]
      .map((group) => ({ ...group, valueEur: group.valueEur + group.cashEur }))
      .sort((left, right) => right.valueEur - left.valueEur);

    return account ? groups.filter((group) => group.accountName === account) : groups;
  });

  readonly totals = computed(() => {
    const groups = this.groups();

    return {
      lines: groups.reduce((count, group) => count + group.holdings.length, 0),
      accounts: groups.length,
      valueEur: Number(groups.reduce((sum, group) => sum + group.valueEur, 0).toFixed(2)),
      unvaluedCount: groups.reduce((count, group) => count + group.unvaluedCount, 0),
    };
  });
}
