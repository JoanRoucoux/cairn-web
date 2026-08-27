import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SignedMoneyPipe } from './signed-money-pipe';

const pipe = (): SignedMoneyPipe => {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'en-GB' }, SignedMoneyPipe] });

  return TestBed.inject(SignedMoneyPipe);
};

describe('SignedMoneyPipe', () => {
  it('should prefix a gain with a plus sign', () => {
    expect(pipe().transform(316.54)).toBe('+€316.54');
  });

  it('should prefix a loss with a real minus sign, not a hyphen', () => {
    expect(pipe().transform(-131.3)).toBe('−€131.30');
  });

  it('should leave a zero unsigned', () => {
    expect(pipe().transform(0)).toBe('€0.00');
  });

  it('should return an empty string for null so ui-delta can render its dash', () => {
    expect(pipe().transform(null)).toBe('');
  });
});
