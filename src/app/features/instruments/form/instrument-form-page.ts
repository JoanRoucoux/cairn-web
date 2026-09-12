import { Component, computed, inject, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';

import { UiButton, UiCard, UiField, UiInput, UiSelect, UiTextarea } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  CreateInstrumentRequestAssetClass,
  CreateInstrumentRequestPriceSource,
  type InstrumentCandidateResponse,
} from '@core/api-client/cairnAPI.schemas';

import { InstrumentDeleteDialog } from './delete-dialog/instrument-delete-dialog';
import { InstrumentFormStore } from './instrument-form-store';
import { IsinLookup } from './isin-lookup/isin-lookup';

@Component({
  selector: 'app-instrument-form-page',
  imports: [
    FormField,
    InstrumentDeleteDialog,
    IsinLookup,
    TranslocoPipe,
    UiButton,
    UiCard,
    UiField,
    UiInput,
    UiSelect,
    UiTextarea,
  ],
  templateUrl: './instrument-form-page.html',
  providers: [InstrumentFormStore],
})
export class InstrumentFormPage {
  #store = inject(InstrumentFormStore);
  #router = inject(Router);

  protected readonly form = this.#store.form;
  protected readonly candidates = this.#store.candidates;
  protected readonly searching = this.#store.searching;
  protected readonly notFound = this.#store.notFound;
  protected readonly error = this.#store.error;
  protected readonly instrument = this.#store.instrument;
  protected readonly editing = computed(() => this.#store.instrumentId() !== undefined);

  protected readonly assetClasses = Object.values(CreateInstrumentRequestAssetClass);
  protected readonly priceSources = Object.values(CreateInstrumentRequestPriceSource);
  // Cairn values a portfolio in euros only: PortfolioService rejects any other currency outright.
  protected readonly currencies = ['EUR'];

  protected readonly deleteOpen = signal(false);

  protected async onSearched(query: string): Promise<void> {
    this.#store.form.isin().value.set(query);
    await this.#store.lookup(query);
  }

  protected onPicked(candidate: InstrumentCandidateResponse): void {
    this.#store.apply(candidate, this.#store.form.isin().value());
  }

  protected async onSave(): Promise<void> {
    if (await this.#store.save()) {
      await this.#router.navigateByUrl('/instruments');
    }
  }

  protected async onDeleted(): Promise<void> {
    this.deleteOpen.set(false);
    await this.#router.navigateByUrl('/instruments');
  }
}
