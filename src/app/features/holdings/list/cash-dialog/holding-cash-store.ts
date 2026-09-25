import { Injectable, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import { AccountService } from '@core/api-client/account/account.service';

import { formMessages } from '@shared/forms/form-messages';

import { holdingCashDraftSchema, initialHoldingCashDraft } from './holding-cash-form';

@Injectable()
export class HoldingCashStore {
  #accountsApiClient = inject(AccountService);

  readonly #model = signal(initialHoldingCashDraft());

  readonly #messages = formMessages();

  readonly form = form(this.#model, holdingCashDraftSchema(this.#messages));

  readonly error = signal(false);

  prefill(balance: number): void {
    this.#model.set(initialHoldingCashDraft(balance));
  }

  // Returns true once the cash balance reached the API.
  async save(accountId: string): Promise<boolean> {
    this.error.set(false);
    let saved = false;

    // submit() marks every field as touched, skips the action while invalid and drives form().submitting().
    await submit(this.form, async () => {
      try {
        const amount = this.#model().amount as number;
        await firstValueFrom(this.#accountsApiClient.setCashBalance(accountId, { amount }));
        saved = true;
      } catch {
        this.error.set(true);
      }
    });

    return saved;
  }
}
