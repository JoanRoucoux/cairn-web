import { LOCALE_ID, Pipe, type PipeTransform, inject } from '@angular/core';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
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

    return this.#format.format(value);
  }
}
