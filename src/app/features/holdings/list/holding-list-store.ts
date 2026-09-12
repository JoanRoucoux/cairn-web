import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';

export type AccountGroup = {
  accountId: string;
  accountName: string;
  accountType: string;
  valueEur: number;
  unvaluedCount: number;
  unrealizedGainEur: number | null;
  stale: boolean;
  holdings: HoldingResponse[];
};

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

  readonly #visible = computed(() => {
    const holdings = this.holdings.hasValue() ? this.holdings.value() : [];
    const search = this.search().trim().toLowerCase();

    return search ? holdings.filter((holding) => matches(holding, search)) : holdings;
  });

  readonly groups = computed<AccountGroup[]>(() => {
    const byAccount = new Map<string, AccountGroup>();

    for (const holding of this.#visible()) {
      const group = byAccount.get(holding.accountId) ?? {
        accountId: holding.accountId,
        accountName: holding.accountName,
        accountType: holding.accountType,
        valueEur: 0,
        unvaluedCount: 0,
        unrealizedGainEur: 0,
        stale: false,
        holdings: [],
      };

      // A null market value is a holding with no quote yet, never a zero: it is counted, not summed.
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

    return [...byAccount.values()].sort((left, right) => right.valueEur - left.valueEur);
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
