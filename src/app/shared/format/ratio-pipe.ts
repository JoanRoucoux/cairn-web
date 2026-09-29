import { LOCALE_ID, Pipe, type PipeTransform, inject } from '@angular/core';

const MINUS_SIGN = '−';

export type RatioOptions = {
  signed?: boolean;
  decimals?: number;
};

@Pipe({ name: 'ratio' })
export class RatioPipe implements PipeTransform {
  #locale = inject(LOCALE_ID);
  #formats = new Map<number, Intl.NumberFormat>();

  #formatFor(decimals: number): Intl.NumberFormat {
    const cached = this.#formats.get(decimals);

    if (cached) {
      return cached;
    }

    const format = new Intl.NumberFormat(this.#locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    this.#formats.set(decimals, format);

    return format;
  }

  transform(value: number | null | undefined, options: RatioOptions = {}): string {
    if (value === null || value === undefined) {
      return '';
    }

    const formatted = this.#formatFor(options.decimals ?? 1).format(Math.abs(value));

    if (!options.signed || value === 0) {
      return formatted;
    }

    return `${value > 0 ? '+' : MINUS_SIGN}${formatted}`;
  }
}
