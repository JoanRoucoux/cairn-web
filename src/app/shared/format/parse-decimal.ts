const NON_BREAKING_SPACE = String.fromCharCode(0x00a0);
const NARROW_NON_BREAKING_SPACE = String.fromCharCode(0x202f);
const SEPARATORS = new RegExp(`[\\s${NON_BREAKING_SPACE}${NARROW_NON_BREAKING_SPACE}]`, 'g');
const ALLOWED_CHARACTERS = /[^\d,.\s]/g;

export const filterDecimalInput = (raw: string): string => raw.replace(ALLOWED_CHARACTERS, '');

export const parseDecimal = (raw: string): number | null => {
  const normalized = raw.replace(SEPARATORS, '').replace(',', '.');

  if (normalized === '') {
    return null;
  }

  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
};
