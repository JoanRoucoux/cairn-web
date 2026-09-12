import { Injectable, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { form, submit } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';

import { firstValueFrom, map } from 'rxjs';

import type {
  CreateInstrumentRequest,
  InstrumentCandidateResponse,
  UpdateInstrumentRequest,
} from '@core/api-client/cairnAPI.schemas';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';

import { formMessages } from '@shared/forms/form-messages';

import { initialInstrumentDraft, instrumentDraftSchema } from './instrument-form';

@Injectable()
export class InstrumentFormStore {
  #instrumentsApiClient = inject(InstrumentService);
  #route = inject(ActivatedRoute);

  readonly instrumentId = toSignal(this.#route.paramMap.pipe(map((params) => params.get('instrumentId') ?? undefined)));

  readonly instrument = rxResource({
    params: () => this.instrumentId(),
    stream: ({ params }) => this.#instrumentsApiClient.getInstrument(params),
  });

  readonly #model = signal(initialInstrumentDraft());

  readonly #messages = formMessages();

  readonly form = form(this.#model, instrumentDraftSchema(this.#messages));

  readonly candidates = signal<InstrumentCandidateResponse[]>([]);
  readonly searching = signal(false);
  readonly notFound = signal(false);
  readonly error = signal(false);

  constructor() {
    effect(() => {
      const instrument = this.instrument.value();

      if (instrument) {
        this.#model.set(initialInstrumentDraft(instrument));
      }
    });
  }

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
        const instrumentId = this.instrumentId();

        if (instrumentId) {
          const request: UpdateInstrumentRequest = {
            name: draft.name,
            isin: draft.isin,
            assetClass: draft.assetClass,
            priceSource: draft.priceSource,
            sourceRef: draft.sourceRef,
            description: draft.description,
          };
          await firstValueFrom(this.#instrumentsApiClient.updateInstrument(instrumentId, request));
        } else {
          const request: CreateInstrumentRequest = {
            name: draft.name,
            isin: draft.isin,
            currency: draft.currency,
            assetClass: draft.assetClass,
            priceSource: draft.priceSource,
            sourceRef: draft.sourceRef,
            description: draft.description,
          };
          await firstValueFrom(this.#instrumentsApiClient.createInstrument(request));
        }

        saved = true;
      } catch {
        this.error.set(true);
      }
    });

    return saved;
  }
}
