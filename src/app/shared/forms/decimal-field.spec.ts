import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, schema } from '@angular/forms/signals';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { decimalText, nonNegativeDecimal } from './decimal-field';
import { formMessages } from './form-messages';

describe('decimalText', () => {
  it('writes a number the way the locale reads it, without grouping', () => {
    expect(decimalText(1732.45, 'fr-FR')).toBe('1732,45');
    expect(decimalText(26.654, 'en-GB')).toBe('26.654');
  });

  it('leaves an unknown value empty', () => {
    expect(decimalText(null, 'fr-FR')).toBe('');
    expect(decimalText(undefined, 'fr-FR')).toBe('');
  });
});

describe('nonNegativeDecimal', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] }));

  const errorsFor = (text: string): string[] =>
    TestBed.runInInjectionContext(() => {
      const messages = formMessages();
      const draft = form(
        signal({ amount: text }),
        schema<{ amount: string }>((path) => nonNegativeDecimal(path.amount, messages)),
      );

      return draft
        .amount()
        .errors()
        .map((error) => error.kind);
    });

  it('accepts an empty field, zero, and a decimal written with a comma or a point', () => {
    expect(errorsFor('')).toEqual([]);
    expect(errorsFor('0')).toEqual([]);
    expect(errorsFor('12,5')).toEqual([]);
    expect(errorsFor('12.5')).toEqual([]);
  });

  it('refuses a negative amount and a text that is not a number', () => {
    expect(errorsFor('-5')).toEqual(['min']);
    expect(errorsFor('12a')).toEqual(['decimal']);
  });
});
