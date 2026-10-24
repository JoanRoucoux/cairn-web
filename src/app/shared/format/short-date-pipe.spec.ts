import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ShortDatePipe } from './short-date-pipe';

describe('ShortDatePipe', () => {
  const transform = (value: string | null | undefined, locale = 'fr-FR'): string => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: locale }] });
    return TestBed.runInInjectionContext(() => new ShortDatePipe().transform(value));
  };

  it('keeps a date-only value on its own day in a zone behind UTC', () => {
    expect(transform('2026-09-24')).toBe('24/09');
  });

  it('reads an instant on the device calendar, not in UTC', () => {
    expect(transform('2026-09-13T02:30:00Z')).toBe('12/09');
  });

  it('returns an empty string for a missing value', () => {
    expect(transform(undefined)).toBe('');
    expect(transform(null)).toBe('');
  });

  it('returns an empty string for an invalid date', () => {
    expect(transform('not-a-date')).toBe('');
  });
});
