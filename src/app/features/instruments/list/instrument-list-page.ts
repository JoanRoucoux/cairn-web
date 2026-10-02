import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  UiAsync,
  UiBackLink,
  UiBadge,
  UiButton,
  UiCard,
  UiField,
  UiFieldLeading,
  UiInput,
  UiMenu,
  UiMenuItem,
  UiMenuTrigger,
  UiRow,
  UiSkeleton,
  UiTable,
  UiTd,
  UiTh,
  UiTr,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import { LucideEllipsis, LucidePencil, LucidePlus, LucideSearch, LucideTrash } from '@lucide/angular';

import { injectToast } from '@shared/feedback/toast';
import { pluralKey } from '@shared/format/plural-key';
import { injectDesktop } from '@shared/layout/desktop-media';

import type { DeletableInstrument } from '../delete-dialog/instrument-delete-dialog';
import { InstrumentDeleteDialog } from '../delete-dialog/instrument-delete-dialog';
import { InstrumentListStore, type InstrumentRow } from './instrument-list-store';

@Component({
  selector: 'app-instrument-list-page',
  imports: [
    InstrumentDeleteDialog,
    LucideEllipsis,
    LucidePencil,
    LucidePlus,
    LucideSearch,
    LucideTrash,
    RouterLink,
    TranslocoPipe,
    UiAsync,
    UiBackLink,
    UiBadge,
    UiButton,
    UiCard,
    UiField,
    UiFieldLeading,
    UiInput,
    UiMenu,
    UiMenuItem,
    UiMenuTrigger,
    UiRow,
    UiSkeleton,
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
  #toast = injectToast();

  protected readonly instruments = this.#store.instruments;
  protected readonly filteredRows = this.#store.filteredRows;
  protected readonly search = this.#store.search;
  protected readonly state = this.#store.state;
  protected readonly skeletonWidths = [180, 140, 200, 160, 190, 150];
  protected readonly desktop = injectDesktop();

  protected readonly cardPadding = computed(
    () => ({ ready: 'p-[6px_8px]', loading: 'px-4 py-2', error: '', empty: '' })[this.state()],
  );

  protected readonly countLabel = translateSignal(
    computed(() => pluralKey('count', this.#store.rows().length)),
    computed(() => ({ count: this.#store.rows().length })),
  );

  protected readonly toDelete = signal<DeletableInstrument | undefined>(undefined);

  protected linesLabel(row: InstrumentRow, full: boolean): string {
    if (row.holdingCount === 0) {
      return full ? 'instruments.noLinesFull' : 'instruments.noLines';
    }

    return pluralKey('instruments.lineCount', row.holdingCount);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected editInstrument(id: string): void {
    void this.#router.navigate(['/instruments', id]);
  }

  protected retry(): void {
    this.#store.retry();
  }

  protected onDeleted(): void {
    this.toDelete.set(undefined);
    this.#toast('instruments.toasts.deleted');
    this.#store.retry();
  }
}
