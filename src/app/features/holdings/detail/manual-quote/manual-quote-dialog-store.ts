import { Injectable, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import { QuoteService } from '@core/api-client/quote/quote.service';

import { formMessages } from '@shared/forms/form-messages';

import { initialManualQuote, manualQuoteSchema } from './manual-quote-form';

@Injectable()
export class ManualQuoteDialogStore {
  #quotesApiClient = inject(QuoteService);

  readonly #model = signal(initialManualQuote());

  readonly #messages = formMessages();

  readonly form = form(this.#model, manualQuoteSchema(this.#messages));

  readonly error = signal(false);

  // Returns true when the quote reached the API.
  async save(instrumentId: string): Promise<boolean> {
    this.error.set(false);
    let saved = false;

    // submit() marks every field as touched, skips the action while invalid and drives form().submitting().
    await submit(this.form, async () => {
      try {
        const model = this.#model();
        await firstValueFrom(
          this.#quotesApiClient.recordQuote(instrumentId, { asOf: model.asOf, price: model.price as number }),
        );
        saved = true;
      } catch {
        this.error.set(true);
      }
    });

    return saved;
  }
}
