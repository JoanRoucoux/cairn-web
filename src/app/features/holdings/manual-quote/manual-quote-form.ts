import { type Schema, min, required, schema } from '@angular/forms/signals';

import type { FormMessages } from '@shared/forms/form-messages';

export type ManualQuote = {
  asOf: string;
  price: number | null;
};

// A factory so each dialog instance gets its own model object.
export const initialManualQuote = (): ManualQuote => ({
  asOf: new Date().toISOString().slice(0, 10),
  price: null,
});

export const manualQuoteSchema = (messages: FormMessages): Schema<ManualQuote> => {
  const belowMin = messages.min(0);

  return schema((quote) => {
    required(quote.asOf, { message: () => messages.required() });
    required(quote.price, { message: () => messages.required() });
    min(quote.price, 0, { message: () => belowMin() });
  });
};
