import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import type { HistoryResponse } from '@core/api-client/cairnAPI.schemas';
import { HistoryService } from '@core/api-client/history/history.service';
import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

import { type ChartRange, rangeStart } from '@shared/chart/chart-range';
import type { ChartPoint } from '@shared/chart/chart-scale';

const EMPTY_HISTORY: HistoryResponse = { mode: 'constant-mix', reconstructed: false, points: [] };

const EPOCH = '1900-01-01';

const isoToday = (): string => new Date().toISOString().slice(0, 10);

@Injectable()
export class PortfolioStore {
  #portfolioApiClient = inject(PortfolioService);
  #historyApiClient = inject(HistoryService);

  readonly range = signal<ChartRange>('1d');

  readonly portfolio = rxResource({
    stream: () => this.#portfolioApiClient.getPortfolio(),
  });

  readonly history = rxResource({
    params: () => this.range(),
    stream: ({ params }) =>
      this.#historyApiClient.getHistory({
        mode: 'constant-mix',
        from: rangeStart(params) ?? EPOCH,
        to: isoToday(),
      }),
    defaultValue: EMPTY_HISTORY,
  });

  readonly points = computed<ChartPoint[]>(() =>
    this.history.value().points.map((point) => ({ t: Date.parse(point.date), v: point.totalEur })),
  );

  readonly reconstructed = computed(() => this.history.value().reconstructed);
}
