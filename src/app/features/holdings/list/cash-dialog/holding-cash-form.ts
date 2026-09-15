import { type Schema, min, required, schema } from '@angular/forms/signals';

import type { FormMessages } from '@shared/forms/form-messages';

export type HoldingCashDraft = {
  amount: number | null;
};

// A factory so each dialog instance gets its own model object.
export const initialHoldingCashDraft = (): HoldingCashDraft => ({
  amount: null,
});

export const holdingCashDraftSchema = (messages: FormMessages): Schema<HoldingCashDraft> => {
  // A minimum just above zero refuses both zero and a negative amount.
  const belowMin = messages.min(0.01);

  return schema((cash) => {
    required(cash.amount, { message: () => messages.required() });
    min(cash.amount, 0.01, { message: () => belowMin() });
  });
};
