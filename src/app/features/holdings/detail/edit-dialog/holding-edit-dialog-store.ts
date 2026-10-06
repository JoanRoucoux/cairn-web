import { Injectable, LOCALE_ID, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';

import { parseDecimal } from '@shared/format/parse-decimal';
import { formMessages } from '@shared/forms/form-messages';

import { holdingEditDraftSchema, initialHoldingEditDraft } from './holding-edit-form';

@Injectable()
export class HoldingEditDialogStore {
  #holdingsApiClient = inject(HoldingService);
  #locale = inject(LOCALE_ID);

  readonly #model = signal(initialHoldingEditDraft());

  readonly #messages = formMessages();

  readonly form = form(this.#model, holdingEditDraftSchema(this.#messages));

  readonly error = signal(false);

  prefill(holding: HoldingResponse): void {
    this.#model.set(initialHoldingEditDraft(holding, this.#locale));
  }

  async save(holdingId: string): Promise<HoldingResponse | null> {
    this.error.set(false);
    let saved: HoldingResponse | null = null;

    await submit(this.form, async () => {
      try {
        const model = this.#model();
        saved = await firstValueFrom(
          this.#holdingsApiClient.updateHolding(holdingId, {
            quantity: parseDecimal(model.quantity) as number,
            averageCost: parseDecimal(model.averageCost),
          }),
        );
      } catch {
        this.error.set(true);
      }
    });

    return saved;
  }
}
