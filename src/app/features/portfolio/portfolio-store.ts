import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import type { Observable } from 'rxjs';

import type { HistoryResponse, IntradayHistoryResponse, PerformanceResponse } from '@core/api-client/cairnAPI.schemas';
import { HistoryService } from '@core/api-client/history/history.service';
import { PerformanceService } from '@core/api-client/performance/performance.service';
import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

import { type ChartRange, rangeStart } from '@shared/chart/chart-range';
import type { ChartPoint } from '@shared/chart/chart-scale';
import { parisDateString } from '@shared/format/paris-date';

type HistoryOrIntraday = HistoryResponse | IntradayHistoryResponse;

const EMPTY_HISTORY: HistoryOrIntraday = { mode: 'constant-mix', reconstructed: false, points: [] };

const EPOCH = '1900-01-01';

@Injectable()
export class PortfolioStore {
  #portfolioApiClient = inject(PortfolioService);
  #historyApiClient = inject(HistoryService);
  #performanceApiClient = inject(PerformanceService);

  readonly range = signal<ChartRange>('1d');

  readonly portfolio = rxResource({
    stream: () => this.#portfolioApiClient.getPortfolio(),
  });

  // `rxResource` cancels the in-flight request for a range it has already moved on from (proven in
  // portfolio-store.spec.ts: flushing a superseded one throws "Cannot flush a cancelled request"),
  // so a late, out-of-order response for an older range never reaches `value()`/the effects below.
  readonly performance = rxResource({
    params: () => this.range(),
    stream: ({ params }) => this.#performanceApiClient.getPortfolioPerformance({ range: params }),
  });

  readonly history = rxResource<HistoryOrIntraday, ChartRange>({
    params: () => this.range(),
    stream: ({ params }): Observable<HistoryOrIntraday> =>
      params === '1d'
        ? this.#historyApiClient.getIntradayHistory({ date: parisDateString(new Date()) })
        : this.#historyApiClient.getHistory({
            mode: 'constant-mix',
            from: rangeStart(params) ?? EPOCH,
            to: parisDateString(new Date()),
          }),
    defaultValue: EMPTY_HISTORY,
  });

  // `rxResource` resets `value()` to `undefined` (or `defaultValue`) as soon as its params change,
  // before the new response lands, which would blank the whole page and the curve on every range
  // switch. These signals hold onto the last resolved response instead, so the page can show the
  // previous range's figures while `rangeLoading` marks them stale.
  readonly #performanceSticky = signal<PerformanceResponse | undefined>(undefined);
  readonly #historySticky = signal<HistoryOrIntraday>(EMPTY_HISTORY);

  readonly performanceValue = computed(() => this.#performanceSticky());

  readonly points = computed<ChartPoint[]>(() => {
    const value = this.#historySticky();

    return 'mode' in value
      ? value.points.map((point) => ({ t: Date.parse(point.date), v: point.totalEur }))
      : value.points.map((point) => ({ t: Date.parse(point.at), v: point.totalEur }));
  });

  readonly reconstructed = computed(() => {
    const value = this.#historySticky();

    return 'mode' in value && value.reconstructed;
  });

  /** The range-dependent parts (curve, tiles, hero change) reload on a range switch, while the portfolio total does not. */
  readonly rangeLoading = computed(() => this.performance.isLoading() || this.history.isLoading());

  /**
   * True once either resource has settled in error for the *currently selected* range - not for a
   * range switched away from, since `status()` (unlike the sticky signals above) always reflects
   * the live resource, never a past one.
   */
  readonly rangeError = computed(() => this.performance.status() === 'error' || this.history.status() === 'error');

  retryRange(): void {
    this.performance.reload();
    this.history.reload();
  }

  constructor() {
    // `.value()` throws while the resource is in an error state, so `status()` is checked first
    // and short-circuits before `.value()` is ever read.
    effect(() => {
      if (this.performance.status() === 'resolved') {
        this.#performanceSticky.set(this.performance.value());
      }
    });

    effect(() => {
      if (this.history.status() === 'resolved') {
        this.#historySticky.set(this.history.value());
      }
    });
  }
}
