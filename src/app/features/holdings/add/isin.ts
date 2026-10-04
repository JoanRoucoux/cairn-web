const ISIN = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

export const compactIsin = (text: string): string => text.replace(/\s/g, '').toUpperCase();

export const isIsin = (text: string): boolean => ISIN.test(compactIsin(text));
