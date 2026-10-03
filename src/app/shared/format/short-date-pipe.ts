import { LOCALE_ID, Pipe, type PipeTransform, inject } from '@angular/core';

@Pipe({ name: 'shortDate' })
export class ShortDatePipe implements PipeTransform {
  #locale = inject(LOCALE_ID);

  #format = new Intl.DateTimeFormat(this.#locale, { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' });

  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? '' : this.#format.format(parsed);
  }
}
