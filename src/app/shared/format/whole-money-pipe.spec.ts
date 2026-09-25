import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WholeMoneyPipe } from './whole-money-pipe';

const pipe = (): WholeMoneyPipe => {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'en-GB' }, WholeMoneyPipe] });

  return TestBed.inject(WholeMoneyPipe);
};

describe('WholeMoneyPipe', () => {
  it('should format without cents', () => {
    expect(pipe().transform(298_889.12)).toBe('€298,889');
  });

  it('should return an empty string for null', () => {
    expect(pipe().transform(null)).toBe('');
  });

  it('should return an empty string for undefined', () => {
    expect(pipe().transform(undefined)).toBe('');
  });
});
