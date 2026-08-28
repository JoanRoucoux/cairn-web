import { type Schema, maxLength, required, schema } from '@angular/forms/signals';

// assetClass and priceSource are free text here: the form lets an operator type a value the
// server enum does not (yet) know, and the server is the one source of truth for validity.
export type InstrumentDraft = {
  name: string;
  isin: string;
  currency: string;
  assetClass: string;
  priceSource: string;
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
