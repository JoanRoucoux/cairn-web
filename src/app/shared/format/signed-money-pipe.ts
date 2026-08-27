import { LOCALE_ID, Pipe, type PipeTransform, inject } from '@angular/core';

const MINUS_SIGN = '−';

@Pipe({ name: 'signedMoney' })
export class SignedMoneyPipe implements PipeTransform {
  #locale = inject(LOCALE_ID);

  #format = new Intl.NumberFormat(this.#locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value === 0) {
      return this.#format.format(0);
    }

    const sign = value > 0 ? '+' : MINUS_SIGN;

    return `${sign}${this.#format.format(Math.abs(value))}`;
  }
}
