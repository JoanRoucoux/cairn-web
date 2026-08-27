import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RatioPipe } from './ratio-pipe';

const pipe = (): RatioPipe => {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'en-GB' }, RatioPipe] });

  return TestBed.inject(RatioPipe);
};

describe('RatioPipe', () => {
  it('should format a fraction as a percentage with one decimal', () => {
    expect(pipe().transform(0.463)).toBe('46.3%');
  });

  it('should sign the value when asked', () => {
    expect(pipe().transform(-0.0026, { signed: true })).toBe('−0.3%');
  });

  it('should prefix a positive signed value with a plus sign', () => {
    expect(pipe().transform(0.0026, { signed: true })).toBe('+0.3%');
  });

  it('should not sign by default', () => {
    expect(pipe().transform(-0.0026)).toBe('0.3%');
  });

  it('should return an empty string for null', () => {
    expect(pipe().transform(null)).toBe('');
  });
});
