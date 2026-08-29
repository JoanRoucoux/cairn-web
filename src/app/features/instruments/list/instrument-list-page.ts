import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton, UiInput, UiTable, UiTd, UiTh } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { InstrumentListStore } from './instrument-list-store';

@Component({
  selector: 'app-instrument-list-page',
  imports: [RouterLink, TranslocoPipe, UiButton, UiInput, UiTable, UiTd, UiTh],
  templateUrl: './instrument-list-page.html',
})
export class InstrumentListPage {
  #store = inject(InstrumentListStore);

  protected readonly instruments = this.#store.instruments;
  protected readonly filteredInstruments = this.#store.filteredInstruments;
  protected readonly search = this.#store.search;

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
