import { type Schema, min, required, schema } from '@angular/forms/signals';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

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

export const holdingDraftSchema: Schema<HoldingDraft> = schema((holding) => {
  required(holding.accountId);
  required(holding.instrumentId);
  required(holding.quantity);
  min(holding.quantity, 0);
  // averageCost stays optional on purpose: twelve of the twenty-six holdings have no cost basis,
  // and forcing a number here would invent one.
  min(holding.averageCost, 0);
});
