export const EUR = 'EUR';

export const isForeignCurrency = (currency: string | null | undefined): currency is string =>
  Boolean(currency) && currency !== EUR;
