import { LOCALE_ID, Pipe, type PipeTransform, inject } from '@angular/core';

const MILLISECONDS_PER_DAY = 86_400_000;

@Pipe({ name: 'relativeDate' })
export class RelativeDatePipe implements PipeTransform {
  #locale = inject(LOCALE_ID);

  #format = new Intl.RelativeTimeFormat(this.#locale, { numeric: 'auto' });

  transform(value: string | null | undefined, now: Date = new Date()): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const days = Math.round((this.#startOfDay(parsed) - this.#startOfDay(now)) / MILLISECONDS_PER_DAY);

    return this.#format.format(days, 'day');
  }

  #startOfDay(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
}
