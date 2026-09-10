import { type Schema, maxLength, required, schema } from '@angular/forms/signals';

import type {
  CreateInstrumentRequestAssetClass,
  CreateInstrumentRequestPriceSource,
} from '@core/api-client/cairnAPI.schemas';

import type { FormMessages } from '@shared/forms/form-messages';

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

export const instrumentDraftSchema = (messages: FormMessages): Schema<InstrumentDraft> => {
  const descriptionTooLong = messages.maxLength(280);

  return schema((instrument) => {
    required(instrument.name, { message: () => messages.required() });
    required(instrument.currency, { message: () => messages.required() });
    required(instrument.assetClass, { message: () => messages.required() });
    required(instrument.priceSource, { message: () => messages.required() });
    maxLength(instrument.description, 280, { message: () => descriptionTooLong() });
  });
};
