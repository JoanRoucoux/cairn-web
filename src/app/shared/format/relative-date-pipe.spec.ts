import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RelativeDatePipe } from './relative-date-pipe';

const pipe = (): RelativeDatePipe => {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'en-GB' }, RelativeDatePipe] });

  return TestBed.inject(RelativeDatePipe);
};

const now = new Date('2026-08-21T20:00:00Z');

describe('RelativeDatePipe', () => {
  it('should report a quote from today', () => {
    expect(pipe().transform('2026-08-21', now)).toBe('today');
  });

  it('should report a quote from yesterday', () => {
    expect(pipe().transform('2026-08-20', now)).toBe('yesterday');
  });

  it('should report a quote from four days ago', () => {
    expect(pipe().transform('2026-08-17', now)).toBe('4 days ago');
  });

  it('should return an empty string for null', () => {
    expect(pipe().transform(null, now)).toBe('');
  });

  it('should return an empty string for an unparseable date', () => {
    expect(pipe().transform('not-a-date', now)).toBe('');
  });
});
