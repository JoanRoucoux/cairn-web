import { type SchemaPath, minError, validate } from '@angular/forms/signals';

import { parseDecimal } from '@shared/format/parse-decimal';

import type { FormMessages } from './form-messages';

export const decimalText = (value: number | null | undefined, locale: string): string =>
  value === null || value === undefined
    ? ''
    : new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }).format(value);

export const nonNegativeDecimal = (path: SchemaPath<string>, messages: FormMessages): void => {
  const belowMin = messages.min(0);

  validate(path, ({ value }) => {
    const parsed = parseDecimal(value());

    if (parsed === null) {
      return value().trim() === '' ? undefined : { kind: 'decimal' };
    }

    return parsed < 0 ? minError(0, { message: belowMin() }) : undefined;
  });
};
