import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import {
  UiAsync,
  UiBadge,
  UiButton,
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
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LucideChevronLeft,
  LucideEllipsis,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { type Observable, fromEvent, map, of, startWith } from 'rxjs';

import { pluralKey } from '@shared/format/plural-key';

import type { DeletableInstrument } from '../delete-dialog/instrument-delete-dialog';
import { InstrumentDeleteDialog } from '../delete-dialog/instrument-delete-dialog';
import { InstrumentListStore, type InstrumentRow } from './instrument-list-store';

const desktopQuery = (): Observable<boolean> => {
  const query = typeof matchMedia === 'function' ? matchMedia('(min-width: 1024px)') : undefined;

  return query
    ? fromEvent<MediaQueryListEvent>(query, 'change').pipe(
        map((event) => event.matches),
        startWith(query.matches),
      )
    : of(false);
};

@Component({
  selector: 'app-instrument-list-page',
  imports: [
    InstrumentDeleteDialog,
    LucideChevronLeft,
    LucideEllipsis,
    LucidePencil,
    LucidePlus,
    LucideSearch,
    LucideTrash2,
    RouterLink,
    TranslocoPipe,
    UiAsync,
    UiBadge,
    UiButton,
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
  #transloco = inject(TranslocoService);
  readonly #translocoEvents = toSignal(this.#transloco.events$);

  protected readonly instruments = this.#store.instruments;
  protected readonly filteredRows = this.#store.filteredRows;
  protected readonly search = this.#store.search;
  protected readonly state = this.#store.state;
  protected readonly skeletonWidths = [120, 90, 100, 80, 110, 96];
  protected readonly desktop = toSignal(desktopQuery(), { requireSync: true });

  protected readonly cardPadding = computed(
    () => ({ ready: 'p-[6px_8px]', loading: 'px-4 py-2', error: 'px-4 py-5', empty: 'p-4' })[this.state()],
  );

  protected readonly countLabel = computed(() => {
    this.#translocoEvents();
    const count = this.#store.rows().length;

    return this.#transloco.translate(pluralKey('instruments.count', count), { count });
  });

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
    this.#store.retry();
  }
}
