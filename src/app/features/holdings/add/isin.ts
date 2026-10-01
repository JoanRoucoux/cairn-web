const ISIN = /^[A-Z]{2}[A-Z0-9]{9}\d$/i;

export const isinOf = (query: string): string | null => (ISIN.test(query.trim()) ? query.trim().toUpperCase() : null);
