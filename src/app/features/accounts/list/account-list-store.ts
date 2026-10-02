import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { type AsyncState } from '@joanroucoux/cairn-ui';

import { AccountService } from '@core/api-client/account/account.service';
import type { AccountType } from '@core/api-client/cairnAPI.schemas';
import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

export type AccountView = {
  id: string;
  name: string;
  type: AccountType;
  institution: string;
  valueEur: number | null;
  share: number | null;
  lineCount: number;
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

  readonly state = computed<AsyncState>(() => {
    if (this.#accounts.error() || this.#portfolio.error()) {
      return 'error';
    }
    if (this.#accounts.status() === 'loading' || this.#portfolio.status() === 'loading') {
      return 'loading';
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
      const unvalued = own.some((holding) => holding.marketValueEur === null || holding.marketValueEur === undefined);
      const valueEur = unvalued ? null : own.reduce((sum, holding) => sum + (holding.marketValueEur as number), 0);

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        institution: account.institution.trim(),
        valueEur,
        share: valueEur !== null && valueEur > 0 && totalEur > 0 ? valueEur / totalEur : null,
        lineCount,
      };
    });

    return views.sort((a, b) => (b.valueEur ?? -1) - (a.valueEur ?? -1));
  });

  readonly totalEur = computed(() => (this.#portfolio.hasValue() ? this.#portfolio.value().totalEur : null));

  retry(): void {
    this.#accounts.reload();
    this.#portfolio.reload();
  }
}
