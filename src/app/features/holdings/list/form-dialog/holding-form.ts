import { type Schema, min, required, schema } from '@angular/forms/signals';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import type { FormMessages } from '@shared/forms/form-messages';

export type HoldingDraft = {
  accountId: string;
  instrumentId: string;
  quantity: number | null;
  averageCost: number | null;
};

// A factory so each dialog instance gets its own model object.
export const initialHoldingDraft = (holding?: HoldingResponse): HoldingDraft => ({
  accountId: holding?.accountId ?? '',
  instrumentId: holding?.instrumentId ?? '',
  quantity: holding?.quantity ?? null,
  averageCost: holding?.averageCost ?? null,
});

export const holdingDraftSchema = (messages: FormMessages): Schema<HoldingDraft> => {
  const belowMin = messages.min(0);

  return schema((holding) => {
    required(holding.accountId, { message: () => messages.required() });
    required(holding.instrumentId, { message: () => messages.required() });
    required(holding.quantity, { message: () => messages.required() });
    min(holding.quantity, 0, { message: () => belowMin() });
    // averageCost stays optional on purpose: twelve of the twenty-six holdings have no cost basis,
    // and forcing a number here would invent one.
    min(holding.averageCost, 0, { message: () => belowMin() });
  });
};
