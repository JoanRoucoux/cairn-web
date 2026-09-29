import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import type { InstrumentResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';

import { normalizeSearch } from '@shared/format/normalize-search';

export type InstrumentRow = InstrumentResponse & { holdingCount: number };

@Injectable()
export class InstrumentListStore {
  #instrumentsApiClient = inject(InstrumentService);
  #holdingsApiClient = inject(HoldingService);

  readonly search = signal('');

  readonly instruments = rxResource({
    stream: () => this.#instrumentsApiClient.listInstruments(),
    defaultValue: [],
  });

  readonly holdings = rxResource({
    stream: () => this.#holdingsApiClient.listHoldings(),
    defaultValue: [],
  });

  readonly #holdingCountByInstrument = computed(() => {
    const counts = new Map<string, number>();
    const holdings = this.holdings.hasValue() ? this.holdings.value() : [];

    for (const holding of holdings) {
      counts.set(holding.instrumentId, (counts.get(holding.instrumentId) ?? 0) + 1);
    }

    return counts;
  });

  readonly rows = computed<InstrumentRow[]>(() => {
    const counts = this.#holdingCountByInstrument();
    const instruments = this.instruments.hasValue() ? this.instruments.value() : [];

    return instruments.map((instrument) => ({ ...instrument, holdingCount: counts.get(instrument.id) ?? 0 }));
  });

  readonly filteredRows = computed(() => {
    const search = normalizeSearch(this.search().trim());

    if (!search) {
      return this.rows();
    }

    return this.rows().filter((instrument) =>
      normalizeSearch(`${instrument.name} ${instrument.isin ?? ''}`).includes(search),
    );
  });
}
