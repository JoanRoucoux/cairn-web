import { Injectable, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import { AccountService } from '@core/api-client/account/account.service';
import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';

import { holdingDraftSchema, initialHoldingDraft } from './holding-form';

@Injectable()
export class HoldingFormDialogStore {
  #holdingsApiClient = inject(HoldingService);
  #accountsApiClient = inject(AccountService);
  #instrumentsApiClient = inject(InstrumentService);

  readonly #model = signal(initialHoldingDraft());

  readonly form = form(this.#model, holdingDraftSchema);

  readonly error = signal(false);

  readonly accounts = rxResource({
    stream: () => this.#accountsApiClient.listAccounts(),
    defaultValue: [],
  });

  readonly instruments = rxResource({
    stream: () => this.#instrumentsApiClient.listInstruments(),
    defaultValue: [],
  });

  prefill(holding: HoldingResponse | undefined): void {
    this.#model.set(initialHoldingDraft(holding));
  }

  async save(holdingId?: string): Promise<boolean> {
    this.error.set(false);
    let saved = false;

    await submit(this.form, async () => {
      try {
        const model = this.#model();
        await firstValueFrom(
          holdingId
            ? this.#holdingsApiClient.updateHolding(holdingId, {
                quantity: model.quantity as number,
                averageCost: model.averageCost,
              })
            : this.#holdingsApiClient.createHolding({
                accountId: model.accountId,
                instrumentId: model.instrumentId,
                quantity: model.quantity as number,
                averageCost: model.averageCost,
              }),
        );
        saved = true;
      } catch {
        this.error.set(true);
      }
    });

    return saved;
  }
}
