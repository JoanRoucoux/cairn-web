import { type Schema, required, schema } from '@angular/forms/signals';

import { decimalText, nonNegativeDecimal } from '@shared/forms/decimal-field';
import type { FormMessages } from '@shared/forms/form-messages';

export type HoldingCashDraft = {
  amount: string;
};

export const initialHoldingCashDraft = (balance = 0, locale = 'en-GB'): HoldingCashDraft => ({
  amount: decimalText(balance, locale),
});

export const holdingCashDraftSchema = (messages: FormMessages): Schema<HoldingCashDraft> =>
  schema((cash) => {
    required(cash.amount, { message: () => messages.required() });
    nonNegativeDecimal(cash.amount, messages);
  });
