import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MoneyPipe } from './money-pipe';

const pipeFor = (locale: string): MoneyPipe => {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: locale }, MoneyPipe] });

  return TestBed.inject(MoneyPipe);
};

describe('MoneyPipe', () => {
  it('should format an amount in euros', () => {
    // Intl emits U+202F and U+00A0 as group separators; normalise before asserting.
    expect(
      pipeFor('fr-FR')
        .transform(278146.45)
        .replace(/[\u202F\u00A0]/g, ' '),
    ).toBe('278 146,45 €');
  });

  it('should format the same amount for an English locale', () => {
    expect(pipeFor('en-GB').transform(278146.45)).toBe('€278,146.45');
  });

  it('should return an empty string for null', () => {
    expect(pipeFor('fr-FR').transform(null)).toBe('');
  });

  it('should return an empty string for undefined', () => {
    expect(pipeFor('fr-FR').transform(undefined)).toBe('');
  });

  it('should not turn a zero into an empty string', () => {
    expect(pipeFor('en-GB').transform(0)).toBe('€0.00');
  });
});
