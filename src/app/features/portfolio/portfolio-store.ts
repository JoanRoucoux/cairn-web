import { Injectable, type Signal, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { type AsyncState, type ChartPoint } from '@joanroucoux/cairn-ui';
import type { Observable } from 'rxjs';

import type {
  HistoryResponse,
  HoldingResponse,
  IntradayHistoryResponse,
  PerformanceResponse,
  PortfolioResponse,
} from '@core/api-client/cairnAPI.schemas';
import { HistoryService } from '@core/api-client/history/history.service';
import { HoldingService } from '@core/api-client/holding/holding.service';
import { PerformanceService } from '@core/api-client/performance/performance.service';
import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

import { type ChartRange, rangeStart } from '@shared/chart/chart-range';
import { parisDateString } from '@shared/format/paris-date';

type HistoryOrIntraday = HistoryResponse | IntradayHistoryResponse;

const EMPTY_HISTORY: HistoryOrIntraday = { mode: 'constant-mix', reconstructed: false, points: [] };

const EPOCH = '1900-01-01';

const MOVER_COUNT = 5;

type ResourceStatus = 'idle' | 'error' | 'loading' | 'reloading' | 'resolved' | 'local';

type ResourceLike<T> = {
  status: Signal<ResourceStatus>;
  value: Signal<T | undefined>;
};

const isSettled = (status: ResourceStatus): boolean => status === 'resolved' || status === 'local';

const toAsyncState = <T>(resource: ResourceLike<T>, isEmpty: (value: T) => boolean): AsyncState => {
  const status = resource.status();

  if (status === 'error') {
    return 'error';
  }

  return isSettled(status) ? (isEmpty(resource.value() as T) ? 'empty' : 'ready') : 'loading';
};

const settledValue = <T>(resource: ResourceLike<T>, fallback: T): T =>
  isSettled(resource.status()) ? (resource.value() as T) : fallback;

@Injectable()
export class PortfolioStore {
  #portfolioApiClient = inject(PortfolioService);
  #holdingApiClient = inject(HoldingService);
  #historyApiClient = inject(HistoryService);
  #performanceApiClient = inject(PerformanceService);

  readonly range = signal<ChartRange>('1m');

  readonly portfolio = rxResource({
    stream: () => this.#portfolioApiClient.getPortfolio(),
  });

  readonly holdings = rxResource({
    stream: () => this.#holdingApiClient.listHoldings(),
  });

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

  readonly #historyValue = linkedSignal<HistoryOrIntraday | undefined, HistoryOrIntraday>({
    source: () => settledValue<HistoryOrIntraday | undefined>(this.history, undefined),
    computation: (settled, previous) => settled ?? previous?.value ?? EMPTY_HISTORY,
  });

  readonly points = computed<ChartPoint[]>(() => {
    const value = this.#historyValue();

    return 'mode' in value
      ? value.points.map((point) => ({ t: Date.parse(point.date), v: point.totalEur }))
      : value.points.map((point) => ({ t: Date.parse(point.at), v: point.totalEur }));
  });

  readonly rangeChange = computed(() => {
    const dayTotal = this.range() === '1d' ? this.performanceValue()?.total : undefined;

    if (dayTotal) {
      return { eur: dayTotal.changeEur, ratio: dayTotal.changeRatio ?? null };
    }

    const points = this.points();

    if (points.length < 2) {
      return undefined;
    }

    const first = (points[0] as ChartPoint).v;
    const change = (points.at(-1) as ChartPoint).v - first;

    return { eur: change, ratio: first === 0 ? null : change / first };
  });

  readonly reconstructed = computed(() => {
    const value = this.#historyValue();

    return 'mode' in value && value.reconstructed;
  });

  readonly portfolioValue = computed<PortfolioResponse | undefined>(() => settledValue(this.portfolio, undefined));

  readonly performanceValue = computed<PerformanceResponse | undefined>(() =>
    settledValue(this.performance, undefined),
  );

  readonly totalState = computed<AsyncState>(() =>
    toAsyncState(this.portfolio, (value) => value.holdings.length === 0),
  );

  readonly curveState = computed<AsyncState>(() => toAsyncState(this.history, (value) => value.points.length === 0));

  readonly #curveShown = linkedSignal<ResourceStatus, boolean>({
    source: () => this.history.status(),
    computation: (status, previous) =>
      isSettled(status) ? true : status === 'error' ? false : (previous?.value ?? false),
  });

  readonly curveBlocking = computed(() => {
    const shown = this.#curveShown();
    const state = this.curveState();

    return (state === 'loading' || state === 'error') && !shown;
  });

  readonly curveReloading = computed(
    () => this.history.status() === 'loading' && this.#curveShown() && this.#historyValue().points.length > 0,
  );

  readonly envelopesState = computed<AsyncState>(() =>
    toAsyncState(this.performance, (value) => value.byEnvelope.length === 0),
  );

  readonly moversState = computed<AsyncState>(() =>
    toAsyncState(this.holdings, (value) => !value.some((holding) => Boolean(holding.dayChangeRatio))),
  );

  readonly allFailed = computed(
    () =>
      this.portfolio.status() === 'error' &&
      this.history.status() === 'error' &&
      this.performance.status() === 'error' &&
      this.holdings.status() === 'error',
  );

  readonly movers = computed<HoldingResponse[]>(() =>
    settledValue(this.holdings, [])
      .filter(
        (candidate): candidate is HoldingResponse & { dayChangeRatio: number } =>
          candidate.dayChangeRatio !== null && candidate.dayChangeRatio !== undefined,
      )
      .sort((left, right) => Math.abs(right.dayChangeRatio) - Math.abs(left.dayChangeRatio))
      .slice(0, MOVER_COUNT),
  );

  retryTotal(): void {
    this.portfolio.reload();
  }

  retryMovers(): void {
    this.holdings.reload();
  }

  retryCurve(): void {
    this.history.reload();
  }

  retryEnvelopes(): void {
    this.performance.reload();
  }
}
