import { LOCALE_ID, Pipe, type PipeTransform, inject } from '@angular/core';

const MINUS_SIGN = '−';

export type RatioOptions = {
  signed?: boolean;
};

@Pipe({ name: 'ratio' })
export class RatioPipe implements PipeTransform {
  #locale = inject(LOCALE_ID);

  #format = new Intl.NumberFormat(this.#locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  transform(value: number | null | undefined, options: RatioOptions = {}): string {
    if (value === null || value === undefined) {
      return '';
    }

    const formatted = this.#format.format(Math.abs(value));

    if (!options.signed || value === 0) {
      return formatted;
    }

    return `${value > 0 ? '+' : MINUS_SIGN}${formatted}`;
  }
}
