import { LOCALE_ID, Pipe, type PipeTransform, inject } from '@angular/core';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

@Pipe({ name: 'shortDate' })
export class ShortDatePipe implements PipeTransform {
  #locale = inject(LOCALE_ID);

  #dateFormat = new Intl.DateTimeFormat(this.#locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  #instantFormat = new Intl.DateTimeFormat(this.#locale, { day: '2-digit', month: '2-digit' });

  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return (DATE_ONLY.test(value) ? this.#dateFormat : this.#instantFormat).format(parsed);
  }
}
