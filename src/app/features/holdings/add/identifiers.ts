export const joinIdentifiers = (...parts: (string | null | undefined)[]): string => parts.filter(Boolean).join(' · ');
