/** Appends Transloco's `_one`/`_other` suffix so a count-keyed message can be pluralized in both languages. */
export const pluralKey = (base: string, count: number): string => `${base}_${count === 1 ? 'one' : 'other'}`;
