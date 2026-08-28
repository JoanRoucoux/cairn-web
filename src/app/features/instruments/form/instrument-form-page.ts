import { Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiButton, UiCard, UiField, UiInput, UiTextarea } from 'cairn-ui';

import type { InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { InstrumentFormStore } from './instrument-form-store';
import { IsinLookup } from './isin-lookup/isin-lookup';

@Component({
  selector: 'app-instrument-form-page',
  imports: [FormField, IsinLookup, TranslocoPipe, UiButton, UiCard, UiField, UiInput, UiTextarea],
  templateUrl: './instrument-form-page.html',
})
export class InstrumentFormPage {
  #store = inject(InstrumentFormStore);
  #router = inject(Router);

  protected readonly form = this.#store.form;
  protected readonly candidates = this.#store.candidates;
  protected readonly searching = this.#store.searching;
  protected readonly notFound = this.#store.notFound;
  protected readonly error = this.#store.error;

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
}
