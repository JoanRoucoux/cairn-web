import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ShortDatePipe } from './short-date-pipe';

describe('ShortDatePipe', () => {
  const transform = (value: string | null | undefined, locale = 'fr-FR'): string => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: locale }] });
    return TestBed.runInInjectionContext(() => new ShortDatePipe().transform(value));
  };

  it('formats a date as day/month', () => {
    expect(transform('2026-09-24')).toBe('24/09');
  });

  it('returns an empty string for a missing value', () => {
    expect(transform(undefined)).toBe('');
    expect(transform(null)).toBe('');
  });

  it('returns an empty string for an invalid date', () => {
    expect(transform('not-a-date')).toBe('');
  });
});
