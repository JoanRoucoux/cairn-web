type Holding = {
  instrumentId: string;
  instrumentName: string;
  isin: string | null;
  assetClass: string;
  priceSource: string;
};

type Instrument = {
  id: string;
  name: string;
  isin: string | null;
  currency: string;
  assetClass: string;
  priceSource: string;
  sourceRef: string;
  description: string;
  externalUrl: string | null;
  holdingCount: number;
};

export const instrument = (holding: Holding): Instrument => ({
  id: holding.instrumentId,
  name: holding.instrumentName,
  isin: holding.isin,
  currency: 'EUR',
  assetClass: holding.assetClass,
  priceSource: holding.priceSource,
  sourceRef: 'AMUNDI-MSCI-WORLD',
  description: 'A physically-replicated ETF tracking the MSCI World index across developed markets.',
  externalUrl: 'https://www.amundietf.com/en/professional/product/view/LU1681043599',
  holdingCount: 1,
});

export const unvaluedInstrument = (holding: Holding): Instrument => ({
  id: holding.instrumentId,
  name: holding.instrumentName,
  isin: null,
  currency: 'EUR',
  assetClass: holding.assetClass,
  priceSource: holding.priceSource,
  sourceRef: 'NEWLY-LISTED-FUND',
  description: 'A fund awaiting its first quote.',
  externalUrl: null,
  holdingCount: 1,
});
