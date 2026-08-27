import { type Schema, min, required, schema } from '@angular/forms/signals';

export type ManualQuote = {
  asOf: string;
  price: number | null;
};

// A factory so each dialog instance gets its own model object.
export const initialManualQuote = (): ManualQuote => ({
  asOf: new Date().toISOString().slice(0, 10),
  price: null,
});

export const manualQuoteSchema: Schema<ManualQuote> = schema((quote) => {
  required(quote.asOf);
  required(quote.price);
  min(quote.price, 0);
});
