const DIACRITICS = /[̀-ͯ]/g;

export const normalizeSearch = (value: string): string => value.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
