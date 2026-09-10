import { type Schema, maxLength, required, schema } from '@angular/forms/signals';

import type {
  CreateInstrumentRequestAssetClass,
  CreateInstrumentRequestPriceSource,
} from '@core/api-client/cairnAPI.schemas';

export type InstrumentDraft = {
  name: string;
  isin: string;
  currency: string;
  assetClass: CreateInstrumentRequestAssetClass;
  priceSource: CreateInstrumentRequestPriceSource;
  sourceRef: string;
  description: string;
};

// A factory so each page instance gets its own model object.
export const initialInstrumentDraft = (): InstrumentDraft => ({
  name: '',
  isin: '',
  currency: 'EUR',
  assetClass: 'ETF',
  priceSource: 'MANUAL',
  sourceRef: '',
  description: '',
});

export const instrumentDraftSchema: Schema<InstrumentDraft> = schema((instrument) => {
  required(instrument.name);
  required(instrument.currency);
  required(instrument.assetClass);
  required(instrument.priceSource);
  maxLength(instrument.description, 280);
});
