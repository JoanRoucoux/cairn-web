import { Injectable, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';

import { formMessages } from '@shared/forms/form-messages';

import { holdingEditDraftSchema, initialHoldingEditDraft } from './holding-edit-form';

@Injectable()
export class HoldingEditDialogStore {
  #holdingsApiClient = inject(HoldingService);

  readonly #model = signal(initialHoldingEditDraft());

  readonly #messages = formMessages();

  readonly form = form(this.#model, holdingEditDraftSchema(this.#messages));

  readonly error = signal(false);

  prefill(holding: HoldingResponse): void {
    this.#model.set(initialHoldingEditDraft(holding));
  }

  async save(holdingId: string): Promise<HoldingResponse | null> {
    this.error.set(false);
    let saved: HoldingResponse | null = null;

    await submit(this.form, async () => {
      try {
        const model = this.#model();
        saved = await firstValueFrom(
          this.#holdingsApiClient.updateHolding(holdingId, {
            quantity: model.quantity as number,
            averageCost: model.averageCost,
          }),
        );
      } catch {
        this.error.set(true);
      }
    });

    return saved;
  }
}
