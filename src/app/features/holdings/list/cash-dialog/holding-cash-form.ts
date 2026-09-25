import { type Schema, min, required, schema } from '@angular/forms/signals';

import type { FormMessages } from '@shared/forms/form-messages';

export type HoldingCashDraft = {
  amount: number | null;
};

export const initialHoldingCashDraft = (balance = 0): HoldingCashDraft => ({
  amount: balance,
});

export const holdingCashDraftSchema = (messages: FormMessages): Schema<HoldingCashDraft> => {
  const belowMin = messages.min(0);

  return schema((cash) => {
    required(cash.amount, { message: () => messages.required() });
    min(cash.amount, 0, { message: () => belowMin() });
  });
};
