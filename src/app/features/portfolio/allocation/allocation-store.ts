import { Injectable, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

@Injectable()
export class AllocationStore {
  #portfolioApiClient = inject(PortfolioService);

  readonly classes = rxResource({
    stream: () => this.#portfolioApiClient.getAssetClassAllocation(),
  });

  readonly accounts = rxResource({
    stream: () => this.#portfolioApiClient.getAccountAllocation(),
  });

  retryClasses(): void {
    this.classes.reload();
  }

  retryAccounts(): void {
    this.accounts.reload();
  }
}
