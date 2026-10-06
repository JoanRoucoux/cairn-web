import { type Schema, required, schema } from '@angular/forms/signals';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalText, nonNegativeDecimal } from '@shared/forms/decimal-field';
import type { FormMessages } from '@shared/forms/form-messages';

export type HoldingEditDraft = {
  quantity: string;
  averageCost: string;
};

export const initialHoldingEditDraft = (holding?: HoldingResponse, locale = 'en-GB'): HoldingEditDraft => ({
  quantity: decimalText(holding?.quantity, locale),
  averageCost: decimalText(holding?.averageCost, locale),
});

export const holdingEditDraftSchema = (messages: FormMessages): Schema<HoldingEditDraft> =>
  schema((holding) => {
    required(holding.quantity, { message: () => messages.required() });
    nonNegativeDecimal(holding.quantity, messages);
    nonNegativeDecimal(holding.averageCost, messages);
  });
