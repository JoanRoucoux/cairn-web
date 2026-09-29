import { type Schema, min, required, schema } from '@angular/forms/signals';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import type { FormMessages } from '@shared/forms/form-messages';

export type HoldingEditDraft = {
  quantity: number | null;
  averageCost: number | null;
};

// A factory so each dialog instance gets its own model object.
export const initialHoldingEditDraft = (holding?: HoldingResponse): HoldingEditDraft => ({
  quantity: holding?.quantity ?? null,
  averageCost: holding?.averageCost ?? null,
});

export const holdingEditDraftSchema = (messages: FormMessages): Schema<HoldingEditDraft> => {
  const belowMin = messages.min(0);

  return schema((holding) => {
    required(holding.quantity, { message: () => messages.required() });
    min(holding.quantity, 0, { message: () => belowMin() });
    // averageCost stays optional on purpose: twelve of the twenty-six holdings have no cost basis,
    // and forcing a number here would invent one.
    min(holding.averageCost, 0, { message: () => belowMin() });
  });
};
