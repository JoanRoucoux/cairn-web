import { type Schema, min, required, schema } from '@angular/forms/signals';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import type { FormMessages } from '@shared/forms/form-messages';

export type HoldingEditDraft = {
  quantity: number | null;
  averageCost: number | null;
};

export const initialHoldingEditDraft = (holding?: HoldingResponse): HoldingEditDraft => ({
  quantity: holding?.quantity ?? null,
  averageCost: holding?.averageCost ?? null,
});

export const holdingEditDraftSchema = (messages: FormMessages): Schema<HoldingEditDraft> => {
  const belowMin = messages.min(0);

  return schema((holding) => {
    required(holding.quantity, { message: () => messages.required() });
    min(holding.quantity, 0, { message: () => belowMin() });
    min(holding.averageCost, 0, { message: () => belowMin() });
  });
};
