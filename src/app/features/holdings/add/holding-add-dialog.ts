import { Component, ElementRef, afterRenderEffect, inject, output, signal } from '@angular/core';

import { UiButton, UiDialog, UiField, UiSelect } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  AssetClass,
  type InstrumentCandidateResponse,
  type InstrumentResponse,
} from '@core/api-client/cairnAPI.schemas';

import { filterDecimalInput } from '@shared/format/parse-decimal';

import { HoldingAddDialogStore, type PickedInstrument } from './holding-add-dialog-store';
import { HoldingAddPicked } from './picked/holding-add-picked';
import { HoldingAddSearch } from './search/holding-add-search';

@Component({
  selector: 'app-holding-add-dialog',
  imports: [HoldingAddPicked, HoldingAddSearch, TranslocoPipe, UiButton, UiDialog, UiField, UiSelect],
  templateUrl: './holding-add-dialog.html',
  providers: [HoldingAddDialogStore],
})
export class HoldingAddDialog {
  #store = inject(HoldingAddDialogStore);

  readonly saved = output<void>();
  readonly dismissed = output<void>();

  protected readonly open = signal(true);

  protected readonly accounts = this.#store.accounts;
  protected readonly accountId = this.#store.accountId;
  protected readonly query = this.#store.query;
  protected readonly filteredCatalog = this.#store.filteredCatalog;
  protected readonly candidates = this.#store.candidates;
  protected readonly searchingOnline = this.#store.searchingOnline;
  protected readonly onlineError = this.#store.onlineError;
  protected readonly onlineSearched = this.#store.onlineSearched;
  protected readonly picked = this.#store.picked;
  protected readonly assetClass = this.#store.assetClass;
  protected readonly assetClasses = Object.values(AssetClass);
  protected readonly quantityText = this.#store.quantityText;
  protected readonly averageCostText = this.#store.averageCostText;
  protected readonly probePrice = this.#store.probePrice;
  protected readonly valueAtProbe = this.#store.valueAtProbe;
  protected readonly valid = this.#store.valid;
  protected readonly submitting = this.#store.submitting;
  protected readonly error = this.#store.error;
  protected readonly instrumentError = this.#store.instrumentError;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        this.#host.nativeElement.querySelector<HTMLSelectElement>('[data-testid="holding-add-account"]')?.focus();
      }
    });
  }

  protected onQueryInput(event: Event): void {
    this.#store.onQueryChange((event.target as HTMLInputElement).value);
  }

  protected onAccountChange(event: Event): void {
    this.accountId.set((event.target as HTMLSelectElement).value);
  }

  protected onAssetClassChange(event: Event): void {
    this.assetClass.set((event.target as HTMLSelectElement).value as AssetClass);
  }

  protected onQuantityInput(event: Event): void {
    this.quantityText.set(filterDecimalInput((event.target as HTMLInputElement).value));
  }

  protected onAverageCostInput(event: Event): void {
    this.averageCostText.set(filterDecimalInput((event.target as HTMLInputElement).value));
  }

  protected pickCatalog(instrument: InstrumentResponse): void {
    this.#store.pickCatalog(instrument);
  }

  protected pickOnline(candidate: InstrumentCandidateResponse): void {
    this.#store.pickOnline(candidate);
  }

  protected pickManual(): void {
    this.#store.pickManual();
  }

  protected unpick(): void {
    this.#store.unpick();
  }

  protected pickedName(): string {
    const picked = this.picked() as PickedInstrument;

    return picked.kind === 'catalog'
      ? picked.instrument.name
      : picked.kind === 'online'
        ? picked.candidate.name
        : picked.name;
  }

  protected pickedSub(): string {
    const picked = this.picked() as PickedInstrument;

    if (picked.kind === 'catalog') {
      return picked.instrument.isin ?? '';
    }

    if (picked.kind === 'online') {
      return `${picked.candidate.exchange ?? ''} · ${picked.candidate.sourceRef}`;
    }

    return '';
  }

  protected isNew(): boolean {
    return this.picked()?.kind !== 'catalog' && this.picked() !== undefined;
  }

  protected retryOnline(): void {
    void this.#store.searchOnline();
  }

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.save()) {
      this.open.set(false);
      this.saved.emit();
    }
  }
}
