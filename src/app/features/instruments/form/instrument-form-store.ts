import { Injectable, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import type {
  CreateInstrumentRequest,
  CreateInstrumentRequestAssetClass,
  CreateInstrumentRequestPriceSource,
  InstrumentCandidateResponse,
} from '@core/api-client/cairnAPI.schemas';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';

import { initialInstrumentDraft, instrumentDraftSchema } from './instrument-form';

@Injectable()
export class InstrumentFormStore {
  #instrumentsApiClient = inject(InstrumentService);

  readonly #model = signal(initialInstrumentDraft());

  readonly form = form(this.#model, instrumentDraftSchema);

  readonly candidates = signal<InstrumentCandidateResponse[]>([]);
  readonly searching = signal(false);
  readonly notFound = signal(false);
  readonly error = signal(false);

  async lookup(query: string): Promise<void> {
    this.searching.set(true);
    this.notFound.set(false);
    this.candidates.set([]);

    try {
      const candidates = await firstValueFrom(this.#instrumentsApiClient.resolveInstrument({ query }));
      this.candidates.set(candidates);
      this.notFound.set(candidates.length === 0);
    } catch {
      // 422 is the documented answer for "no candidate": it is an outcome, not a failure.
      this.notFound.set(true);
    } finally {
      this.searching.set(false);
    }
  }

  apply(candidate: InstrumentCandidateResponse, isin: string): void {
    this.#model.update((draft) => ({
      ...draft,
      name: candidate.name,
      isin,
      assetClass: candidate.assetClass,
      priceSource: candidate.source,
      sourceRef: candidate.sourceRef,
    }));
  }

  async save(): Promise<boolean> {
    this.error.set(false);
    let saved = false;

    await submit(this.form, async () => {
      try {
        const draft = this.#model();
        // The server is the source of truth for assetClass/priceSource validity: it rejects an
        // unknown value with a 422, which the catch below turns into an error state.
        const request: CreateInstrumentRequest = {
          ...draft,
          assetClass: draft.assetClass as CreateInstrumentRequestAssetClass,
          priceSource: draft.priceSource as CreateInstrumentRequestPriceSource,
        };

        await firstValueFrom(this.#instrumentsApiClient.createInstrument(request));
        saved = true;
      } catch {
        this.error.set(true);
      }
    });

    return saved;
  }
}
