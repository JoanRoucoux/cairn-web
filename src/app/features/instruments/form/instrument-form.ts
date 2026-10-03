import { type Schema, maxLength, required, schema } from '@angular/forms/signals';

import type { AssetClass, InstrumentDetailResponse, PriceSource } from '@core/api-client/cairnAPI.schemas';

import type { FormMessages } from '@shared/forms/form-messages';

export type InstrumentDraft = {
  name: string;
  isin: string;
  currency: string;
  assetClass: AssetClass;
  priceSource: PriceSource;
  sourceRef: string;
  symbol: string;
  description: string;
};

export const initialInstrumentDraft = (instrument?: InstrumentDetailResponse): InstrumentDraft => ({
  name: instrument?.name ?? '',
  isin: instrument?.isin ?? '',
  currency: 'EUR',
  assetClass: instrument?.assetClass ?? 'ETF',
  priceSource: instrument?.priceSource ?? 'MANUAL',
  sourceRef: instrument?.sourceRef ?? '',
  symbol: instrument?.symbol ?? '',
  description: instrument?.description ?? '',
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
