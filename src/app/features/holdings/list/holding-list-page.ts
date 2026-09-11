import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';

import { UiButton, UiField, UiInput, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { MoneyPipe } from '@shared/format/money-pipe';

import { HoldingAccountGroup } from './account-group/holding-account-group';
import { HoldingDeleteDialog } from './delete-dialog/holding-delete-dialog';
import { HoldingFormDialog } from './form-dialog/holding-form-dialog';
import { HoldingListStore } from './holding-list-store';

@Component({
  selector: 'app-holding-list-page',
  imports: [
    HoldingAccountGroup,
    HoldingDeleteDialog,
    HoldingFormDialog,
    MoneyPipe,
    TranslocoPipe,
    UiButton,
    UiField,
    UiInput,
    UiSkeleton,
  ],
  templateUrl: './holding-list-page.html',
})
export class HoldingListPage {
  #store = inject(HoldingListStore);

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  protected readonly holdings = this.#store.holdings;
  protected readonly groups = this.#store.groups;
  protected readonly totals = this.#store.totals;
  protected readonly search = this.#store.search;

  protected readonly formOpen = signal(false);
  protected readonly holdingToEdit = signal<HoldingResponse | undefined>(undefined);
  protected readonly holdingToDelete = signal<HoldingResponse | undefined>(undefined);

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onAdd(): void {
    this.holdingToEdit.set(undefined);
    this.formOpen.set(true);
  }

  protected onEdit(holding: HoldingResponse): void {
    this.holdingToEdit.set(holding);
    this.formOpen.set(true);
  }

  protected onFormSaved(): void {
    this.formOpen.set(false);
    this.holdings.reload();
  }

  protected onFormDismissed(): void {
    this.formOpen.set(false);
  }

  protected onDeleted(): void {
    this.holdingToDelete.set(undefined);
    this.holdings.reload();
    this.heading().nativeElement.focus();
  }
}
