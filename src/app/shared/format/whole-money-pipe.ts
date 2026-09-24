import { LOCALE_ID, Pipe, type PipeTransform, inject } from '@angular/core';

@Pipe({ name: 'wholeMoney' })
export class WholeMoneyPipe implements PipeTransform {
  #locale = inject(LOCALE_ID);

  #format = new Intl.NumberFormat(this.#locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }

    return this.#format.format(value);
  }
}
