import {
  Injectable,
  type ResourceStatus,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import type { ChartPoint } from '@joanroucoux/cairn-ui/line-chart';
import { map } from 'rxjs';

import type { QuoteResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';
import { QuoteService } from '@core/api-client/quote/quote.service';

import { type ChartRange, rangeStart } from '@shared/chart/chart-range';

import { HoldingChanges } from '../holding-changes';

const EPOCH = '1900-01-01';

const isoToday = (): string => new Date().toISOString().slice(0, 10);

@Injectable()
export class HoldingDetailStore {
  #holdingsApiClient = inject(HoldingService);
  #instrumentsApiClient = inject(InstrumentService);
  #quotesApiClient = inject(QuoteService);
  #route = inject(ActivatedRoute);
  #changes = inject(HoldingChanges);

  readonly holdingId = toSignal(this.#route.paramMap.pipe(map((params) => params.get('holdingId') ?? undefined)));

  readonly range = signal<ChartRange>('1m');

  readonly holdings = rxResource({
    stream: () => this.#holdingsApiClient.listHoldings(),
    defaultValue: [],
  });

  readonly holding = computed(() =>
    this.holdings.hasValue() ? this.holdings.value().find((candidate) => candidate.id === this.holdingId()) : undefined,
  );

  readonly instrument = rxResource({
    params: () => this.holding()?.instrumentId,
    stream: ({ params }) => this.#instrumentsApiClient.getInstrument(params),
  });

  readonly quotes = rxResource({
    params: () => {
      const instrumentId = this.holding()?.instrumentId;

      return instrumentId ? { instrumentId, range: this.range() } : undefined;
    },
    stream: ({ params }) =>
      this.#quotesApiClient.listQuotes(params.instrumentId, {
        from: rangeStart(params.range) ?? EPOCH,
        to: isoToday(),
      }),
    defaultValue: [],
  });

  readonly #series = linkedSignal<
    { instrumentId: string | undefined; range: ChartRange; quotes: QuoteResponse[] | undefined },
    { range: ChartRange; quotes: QuoteResponse[] }
  >({
    source: () => {
      const status = this.quotes.status();

      return {
        instrumentId: this.holding()?.instrumentId,
        range: this.range(),
        quotes: status === 'loading' || status === 'error' ? undefined : this.quotes.value(),
      };
    },
    computation: (source, previous) =>
      source.quotes
        ? { range: source.range, quotes: source.quotes }
        : previous && previous.source.instrumentId === source.instrumentId
          ? previous.value
          : { range: source.range, quotes: [] },
  });

  readonly shownRange = computed(() => this.#series().range);

  readonly quotesFailed = computed(() => this.quotes.status() === 'error');

  readonly #retrying = linkedSignal<ResourceStatus, boolean>({
    source: () => this.quotes.status(),
    computation: (status, previous) =>
      status === 'resolved' || status === 'error' ? false : (previous?.value ?? false),
  });

  readonly quotesRetrying = this.#retrying.asReadonly();

  readonly points = computed<ChartPoint[]>(() => {
    const quantity = this.holding()?.quantity ?? 0;

    return this.#series().quotes.map((quote) => ({ t: Date.parse(quote.asOf), v: quote.price * quantity }));
  });

  readonly rangeChange = computed(() => {
    const points = this.points();
    const first = points[0];
    const last = points.at(-1);

    if (!first || !last || points.length < 2) {
      return undefined;
    }

    const amount = last.v - first.v;

    return { amount, ratio: first.v === 0 ? null : amount / first.v };
  });

  #changesSeen = false;

  constructor() {
    effect(() => {
      this.#changes.lastTouched();

      if (this.#changesSeen) {
        untracked(() => this.reload());
      }

      this.#changesSeen = true;
    });
  }

  retryQuotes(): void {
    this.#retrying.set(true);
    this.quotes.reload();
  }

  reload(): void {
    this.holdings.reload();
    this.quotes.reload();
  }
}
