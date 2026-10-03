import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { type AsyncState } from '@joanroucoux/cairn-ui';

import { AccountService } from '@core/api-client/account/account.service';
import type { AccountType } from '@core/api-client/cairnAPI.schemas';
import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

import { type ExcludedCounts, excludedCounts, isExcluded } from '@shared/format/excluded-lines';

export type AccountView = ExcludedCounts & {
  id: string;
  name: string;
  type: AccountType;
  institution: string;
  valueEur: number;
  share: number | null;
  lineCount: number;
  excludedLineId: string | null;
  balanceAt: string | null;
  empty: boolean;
};

@Injectable()
export class AccountListStore {
  #accountsApiClient = inject(AccountService);
  #portfolioApiClient = inject(PortfolioService);

  readonly #accounts = rxResource({
    stream: () => this.#accountsApiClient.listAccounts(),
    defaultValue: [],
  });

  readonly #portfolio = rxResource({
    stream: () => this.#portfolioApiClient.getPortfolio(),
  });

  #isLoading(resource: { status: () => string; error: () => unknown }): boolean {
    const status = resource.status();

    return status === 'loading' || (status === 'reloading' && Boolean(resource.error()));
  }

  readonly state = computed<AsyncState>(() => {
    if (this.#isLoading(this.#accounts) || this.#isLoading(this.#portfolio)) {
      return 'loading';
    }
    if (this.#accounts.error() || this.#portfolio.error()) {
      return 'error';
    }

    return this.accounts().length === 0 ? 'empty' : 'ready';
  });

  readonly accounts = computed<AccountView[]>(() => {
    if (!this.#accounts.hasValue() || !this.#portfolio.hasValue()) {
      return [];
    }

    const { holdings, totalEur } = this.#portfolio.value();

    const views = this.#accounts.value().map((account) => {
      const own = holdings.filter((holding) => holding.accountId === account.id);
      const lineCount = own.filter((holding) => !holding.accountCash).length;
      const excluded = own.filter((holding) => !holding.accountCash && isExcluded(holding));
      const cash = own.find((holding) => holding.accountCash);
      const valueEur = own.reduce((sum, holding) => sum + (holding.marketValueEur ?? 0), 0);

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        institution: account.institution.trim(),
        valueEur,
        share: valueEur > 0 && totalEur > 0 ? valueEur / totalEur : null,
        lineCount,
        ...excludedCounts(excluded),
        excludedLineId: excluded.length === 1 ? excluded[0]!.id : null,
        balanceAt: cash?.updatedAt ?? null,
        empty: account.type !== 'SAVINGS' && lineCount === 0 && !cash,
      };
    });

    return views.sort((a, b) => b.valueEur - a.valueEur);
  });

  readonly totalEur = computed(() => (this.#portfolio.hasValue() ? this.#portfolio.value().totalEur : null));

  readonly excluded = computed<ExcludedCounts>(() => {
    if (!this.#portfolio.hasValue()) {
      return { unvaluedCount: 0, nonEurCount: 0 };
    }

    const { unvaluedCount, nonEurCount } = this.#portfolio.value();

    return { unvaluedCount, nonEurCount };
  });

  retry(): void {
    this.#accounts.reload();
    this.#portfolio.reload();
  }
}
