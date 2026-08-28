import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { InstrumentService } from '@core/api-client/instrument/instrument.service';

@Injectable()
export class InstrumentListStore {
  #instrumentsApiClient = inject(InstrumentService);

  readonly search = signal('');

  readonly instruments = rxResource({
    stream: () => this.#instrumentsApiClient.listInstruments(),
    defaultValue: [],
  });

  readonly filteredInstruments = computed(() => {
    const instruments = this.instruments.hasValue() ? this.instruments.value() : [];
    const search = this.search().trim().toLowerCase();

    if (!search) {
      return instruments;
    }

    return instruments.filter((instrument) =>
      `${instrument.name} ${instrument.isin ?? ''}`.toLowerCase().includes(search),
    );
  });
}
