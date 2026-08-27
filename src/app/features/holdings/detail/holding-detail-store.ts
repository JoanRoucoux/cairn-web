import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { map } from 'rxjs';

import { HoldingService } from '@core/api-client/holding/holding.service';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';
import { QuoteService } from '@core/api-client/quote/quote.service';

import { type ChartRange, rangeStart } from '@shared/chart/chart-range';
import type { ChartPoint } from '@shared/chart/chart-scale';

const EPOCH = '1900-01-01';

const isoToday = (): string => new Date().toISOString().slice(0, 10);

@Injectable()
export class HoldingDetailStore {
  #holdingsApiClient = inject(HoldingService);
  #instrumentsApiClient = inject(InstrumentService);
  #quotesApiClient = inject(QuoteService);
  #route = inject(ActivatedRoute);

  readonly holdingId = toSignal(this.#route.paramMap.pipe(map((params) => params.get('holdingId') ?? undefined)));

  readonly range = signal<ChartRange>('1m');

  readonly holdings = rxResource({
    stream: () => this.#holdingsApiClient.listHoldings(),
    defaultValue: [],
  });

  readonly holding = computed(() => this.holdings.value().find((candidate) => candidate.id === this.holdingId()));

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

  readonly points = computed<ChartPoint[]>(() =>
    this.quotes.value().map((quote) => ({ t: Date.parse(quote.asOf), v: quote.price })),
  );

  reload(): void {
    this.holdings.reload();
    this.quotes.reload();
  }
}
