import { periodLabel } from './period-label';

describe('periodLabel', () => {
  it('names the date of the first point on the Max range', () => {
    expect(periodLabel('max', 'mars 2019')).toEqual({
      key: 'portfolio.curve.period.since',
      params: { date: 'mars 2019' },
    });
  });

  it('falls back to the start of the history on the Max range with no first point', () => {
    expect(periodLabel('max', null)).toEqual({ key: 'portfolio.curve.period.max', params: {} });
  });

  it('keeps the range wording on every other range', () => {
    expect(periodLabel('1y', 'mars 2019')).toEqual({ key: 'portfolio.curve.period.1y', params: {} });
  });
});
