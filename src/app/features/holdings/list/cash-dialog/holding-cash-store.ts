import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import type { InstrumentResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';
import { InstrumentService } from '@core/api-client/instrument/instrument.service';
import { QuoteService } from '@core/api-client/quote/quote.service';

import { formMessages } from '@shared/forms/form-messages';

import { holdingCashDraftSchema, initialHoldingCashDraft } from './holding-cash-form';

const EUR_CASH_SOURCE_REF = 'EUR';

const isEurCashInstrument = (instrument: InstrumentResponse): boolean =>
  instrument.assetClass === 'CASH' &&
  instrument.priceSource === 'MANUAL' &&
  instrument.sourceRef === EUR_CASH_SOURCE_REF;

@Injectable()
export class HoldingCashStore {
  #holdingsApiClient = inject(HoldingService);
  #instrumentsApiClient = inject(InstrumentService);
  #quotesApiClient = inject(QuoteService);

  readonly #model = signal(initialHoldingCashDraft());

  readonly #messages = formMessages();

  readonly form = form(this.#model, holdingCashDraftSchema(this.#messages));

  readonly error = signal(false);
  readonly duplicate = signal(false);

  async #eurCashInstrumentId(): Promise<string> {
    const instruments = await firstValueFrom(this.#instrumentsApiClient.listInstruments());
    const existing = instruments.find(isEurCashInstrument);

    const instrumentId =
      existing?.id ??
      (
        await firstValueFrom(
          this.#instrumentsApiClient.createInstrument({
            name: 'Euros',
            currency: 'EUR',
            assetClass: 'CASH',
            priceSource: 'MANUAL',
            sourceRef: EUR_CASH_SOURCE_REF,
          }),
        )
      ).id;

    // Recorded on every attempt, not only on creation: the server replaces the day's quote, and an
    // instrument whose quote failed once would otherwise stay unpriced for good.
    await firstValueFrom(
      this.#quotesApiClient.recordQuote(instrumentId, {
        asOf: new Date().toISOString().slice(0, 10),
        price: 1,
      }),
    );

    return instrumentId;
  }

  // Returns true once the cash line reached the API.
  async save(accountId: string): Promise<boolean> {
    this.error.set(false);
    this.duplicate.set(false);
    let saved = false;

    // submit() marks every field as touched, skips the action while invalid and drives form().submitting().
    await submit(this.form, async () => {
      try {
        const instrumentId = await this.#eurCashInstrumentId();
        const amount = this.#model().amount as number;

        // One euro bought for one euro: the gain reads zero rather than unknown, which keeps the
        // account subtotal a number instead of turning it into a partial sum.
        await firstValueFrom(
          this.#holdingsApiClient.createHolding({ accountId, instrumentId, quantity: amount, averageCost: 1 }),
        );
        saved = true;
      } catch (caught) {
        if (caught instanceof HttpErrorResponse && caught.status === 409) {
          this.duplicate.set(true);
        } else {
          this.error.set(true);
        }
      }
    });

    return saved;
  }
}
