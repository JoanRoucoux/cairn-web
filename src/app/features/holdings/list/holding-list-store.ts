import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';

export type AccountGroup = {
  accountId: string;
  accountName: string;
  accountType: string;
  valueEur: number;
  cashEur: number;
  unvaluedCount: number;
  unrealizedGainEur: number | null;
  stale: boolean;
  holdings: HoldingResponse[];
};

const isEurCash = (holding: HoldingResponse): boolean =>
  holding.assetClass === 'CASH' && holding.priceSource === 'MANUAL' && holding.priceCurrency === 'EUR';

const matches = (holding: HoldingResponse, search: string): boolean =>
  `${holding.instrumentName} ${holding.accountName}`.toLowerCase().includes(search);

@Injectable()
export class HoldingListStore {
  #holdingsApiClient = inject(HoldingService);

  readonly search = signal('');

  readonly holdings = rxResource({
    stream: () => this.#holdingsApiClient.listHoldings(),
    defaultValue: [],
  });

  readonly #allHoldings = computed(() => (this.holdings.hasValue() ? this.holdings.value() : []));

  // Kept off the search filter: the cash line stays in every visible group regardless of what
  // the user typed, so its balance always comes from the unfiltered list. Also the only source of
  // an account that holds nothing but cash: it never appears among ordinary positions.
  readonly #cashByAccount = computed(() => {
    const cash = new Map<string, { accountName: string; accountType: string; amount: number }>();

    for (const holding of this.#allHoldings()) {
      if (isEurCash(holding)) {
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
    const positions = this.#allHoldings().filter((holding) => !isEurCash(holding));
    const search = this.search().trim().toLowerCase();

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

    // An account with only a cash line owns no ordinary holding, so the loop above never sees it:
    // seed one directly from the cash holding, unless the search hid it (its account name is the
    // only thing to match against, since it has no instrument line of its own).
    const search = this.search().trim().toLowerCase();

    for (const [accountId, info] of cashByAccount) {
      if (byAccount.has(accountId) || (search && !info.accountName.toLowerCase().includes(search))) {
        continue;
      }

      byAccount.set(accountId, {
        accountId,
        accountName: info.accountName,
        accountType: info.accountType,
        valueEur: 0,
        cashEur: info.amount,
        unvaluedCount: 0,
        unrealizedGainEur: 0,
        stale: false,
        holdings: [],
      });
    }

    return [...byAccount.values()]
      .map((group) => ({ ...group, valueEur: group.valueEur + group.cashEur }))
      .sort((left, right) => right.valueEur - left.valueEur);
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
