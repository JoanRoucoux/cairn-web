export const pluralKey = (base: string, count: number): string => `${base}_${count === 1 ? 'one' : 'other'}`;
