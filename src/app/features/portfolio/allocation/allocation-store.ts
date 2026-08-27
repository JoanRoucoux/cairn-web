import { Injectable, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

@Injectable()
export class AllocationStore {
  #portfolioApiClient = inject(PortfolioService);

  readonly portfolio = rxResource({
    stream: () => this.#portfolioApiClient.getPortfolio(),
  });
}
