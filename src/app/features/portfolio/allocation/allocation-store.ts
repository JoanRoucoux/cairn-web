import { Injectable, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { AccountService } from '@core/api-client/account/account.service';
import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

@Injectable()
export class AllocationStore {
  #portfolioApiClient = inject(PortfolioService);
  #accountsApiClient = inject(AccountService);

  readonly portfolio = rxResource({
    stream: () => this.#portfolioApiClient.getPortfolio(),
  });

  readonly accounts = rxResource({
    stream: () => this.#accountsApiClient.listAccounts(),
    defaultValue: [],
  });

  retry(): void {
    this.portfolio.reload();
    this.accounts.reload();
  }
}
