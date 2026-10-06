import { type Schema, required, schema } from '@angular/forms/signals';

import { nonNegativeDecimal } from '@shared/forms/decimal-field';
import type { FormMessages } from '@shared/forms/form-messages';

export type ManualQuote = {
  asOf: string;
  price: string;
};

export const initialManualQuote = (): ManualQuote => ({
  asOf: new Date().toISOString().slice(0, 10),
  price: '',
});

export const manualQuoteSchema = (messages: FormMessages): Schema<ManualQuote> =>
  schema((quote) => {
    required(quote.asOf, { message: () => messages.required() });
    required(quote.price, { message: () => messages.required() });
    nonNegativeDecimal(quote.price, messages);
  });
