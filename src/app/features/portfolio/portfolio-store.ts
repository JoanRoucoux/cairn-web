import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import type { HistoryResponse } from '@core/api-client/cairnAPI.schemas';
import { HistoryService } from '@core/api-client/history/history.service';
import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

import type { ChartPoint } from '@shared/chart/chart-scale';

export const PORTFOLIO_RANGES = ['1d', '7d', '1m', '1y', '5y', 'max'] as const;
export type PortfolioRange = (typeof PORTFOLIO_RANGES)[number];

const RANGE_DAYS: Record<PortfolioRange, number> = {
  '1d': 1,
  '7d': 7,
  '1m': 31,
  '1y': 366,
  '5y': 1827,
  max: 36_525,
};

const EMPTY_HISTORY: HistoryResponse = { mode: 'constant-mix', reconstructed: false, points: [] };

const isoDaysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

const isoToday = (): string => new Date().toISOString().slice(0, 10);

@Injectable()
export class PortfolioStore {
  #portfolioApiClient = inject(PortfolioService);
  #historyApiClient = inject(HistoryService);

  readonly range = signal<PortfolioRange>('1d');

  readonly portfolio = rxResource({
    stream: () => this.#portfolioApiClient.getPortfolio(),
  });

  readonly history = rxResource({
    params: () => this.range(),
    stream: ({ params }) =>
      this.#historyApiClient.getHistory({
        mode: 'constant-mix',
        from: isoDaysAgo(RANGE_DAYS[params]),
        to: isoToday(),
      }),
    defaultValue: EMPTY_HISTORY,
  });

  readonly points = computed<ChartPoint[]>(() =>
    this.history.value().points.map((point) => ({ t: Date.parse(point.date), v: point.totalEur })),
  );

  readonly reconstructed = computed(() => this.history.value().reconstructed);
}
