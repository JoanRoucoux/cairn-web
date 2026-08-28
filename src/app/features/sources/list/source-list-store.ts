import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { firstValueFrom } from 'rxjs';

import type { RefreshReportResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';
import { JobsService } from '@core/api-client/jobs/jobs.service';
import { QuoteService } from '@core/api-client/quote/quote.service';

const RUN_LIMIT = 10;

export type SourceStatus = {
  source: string;
  lineCount: number;
  lastQuoteAt: string | null;
  stale: boolean;
};

@Injectable()
export class SourceListStore {
  #holdingsApiClient = inject(HoldingService);
  #jobsApiClient = inject(JobsService);
  #quotesApiClient = inject(QuoteService);

  readonly refreshing = signal(false);
  readonly report = signal<RefreshReportResponse | undefined>(undefined);
  readonly error = signal(false);

  readonly holdings = rxResource({
    stream: () => this.#holdingsApiClient.listHoldings(),
    defaultValue: [],
  });

  readonly runs = rxResource({
    stream: () => this.#jobsApiClient.getJobRuns({ limit: RUN_LIMIT }),
    defaultValue: [],
  });

  readonly sources = computed<SourceStatus[]>(() => {
    const holdings = this.holdings.hasValue() ? this.holdings.value() : [];
    const bySource = new Map<string, SourceStatus>();

    for (const holding of holdings) {
      const status = bySource.get(holding.priceSource) ?? {
        source: holding.priceSource,
        lineCount: 0,
        lastQuoteAt: null,
        stale: false,
      };

      status.lineCount += 1;
      status.stale = status.stale || holding.stale;

      if (holding.priceAsOf && (status.lastQuoteAt === null || holding.priceAsOf > status.lastQuoteAt)) {
        status.lastQuoteAt = holding.priceAsOf;
      }

      bySource.set(holding.priceSource, status);
    }

    return [...bySource.values()];
  });

  async refresh(): Promise<void> {
    this.refreshing.set(true);
    this.error.set(false);
    this.report.set(undefined);

    try {
      this.report.set(await firstValueFrom(this.#quotesApiClient.refreshQuotes()));
      this.holdings.reload();
      this.runs.reload();
    } catch {
      this.error.set(true);
    } finally {
      this.refreshing.set(false);
    }
  }
}
