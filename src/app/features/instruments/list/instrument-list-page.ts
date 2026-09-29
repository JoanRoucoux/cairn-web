import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  UiButton,
  UiField,
  UiInput,
  UiMenu,
  UiMenuItem,
  UiMenuTrigger,
  UiTable,
  UiTd,
  UiTh,
  UiTr,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis, LucidePlus } from '@lucide/angular';

import type { DeletableInstrument } from '../delete-dialog/instrument-delete-dialog';
import { InstrumentDeleteDialog } from '../delete-dialog/instrument-delete-dialog';
import { InstrumentListStore } from './instrument-list-store';

@Component({
  selector: 'app-instrument-list-page',
  imports: [
    InstrumentDeleteDialog,
    LucideEllipsis,
    LucidePlus,
    RouterLink,
    TranslocoPipe,
    UiButton,
    UiField,
    UiInput,
    UiMenu,
    UiMenuItem,
    UiMenuTrigger,
    UiTable,
    UiTd,
    UiTh,
    UiTr,
  ],
  templateUrl: './instrument-list-page.html',
  providers: [InstrumentListStore],
})
export class InstrumentListPage {
  #store = inject(InstrumentListStore);
  #router = inject(Router);

  protected readonly instruments = this.#store.instruments;
  protected readonly filteredRows = this.#store.filteredRows;
  protected readonly search = this.#store.search;

  protected readonly toDelete = signal<DeletableInstrument | undefined>(undefined);

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected editInstrument(id: string): void {
    void this.#router.navigate(['/instruments', id]);
  }

  protected onDeleted(): void {
    this.toDelete.set(undefined);
    this.instruments.reload();
  }
}
