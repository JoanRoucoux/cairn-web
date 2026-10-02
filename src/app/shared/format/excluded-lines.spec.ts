import { excludedCounts, excludedTotal, isExcluded, isNonEur } from './excluded-lines';

describe('excluded lines', () => {
  it('should treat a line with a EUR value as counted', () => {
    expect(isExcluded({ marketValueEur: 0, priceCurrency: 'EUR' })).toBe(false);
  });

  it.each([{ marketValueEur: null }, { marketValueEur: undefined }, {}])(
    'should leave out a line with no EUR value (%o)',
    (line) => {
      expect(isExcluded(line)).toBe(true);
    },
  );

  it('should call a line without a EUR value non-EUR only when it is quoted in another currency', () => {
    expect(isNonEur({ priceCurrency: 'USD' })).toBe(true);
    expect(isNonEur({ priceCurrency: 'EUR' })).toBe(false);
    expect(isNonEur({ priceCurrency: null })).toBe(false);
    expect(isNonEur({})).toBe(false);
    expect(isNonEur({ marketValueEur: 10, priceCurrency: 'USD' })).toBe(false);
  });

  it('should follow the API: a line with no quote is unpriced whatever its instrument, only a non-EUR quote makes it non-EUR', () => {
    expect(excludedCounts([{ marketValueEur: null, priceCurrency: null }])).toEqual({
      unvaluedCount: 1,
      nonEurCount: 0,
    });
    expect(excludedCounts([{ marketValueEur: null, priceCurrency: 'USD' }])).toEqual({
      unvaluedCount: 0,
      nonEurCount: 1,
    });
  });

  it('should count the unpriced and the non-EUR lines apart', () => {
    expect(
      excludedCounts([
        { marketValueEur: 10, priceCurrency: 'EUR' },
        { marketValueEur: null, priceCurrency: null },
        { priceCurrency: 'USD' },
        { priceCurrency: 'GBP' },
      ]),
    ).toEqual({ unvaluedCount: 1, nonEurCount: 2 });
  });

  it('should say nothing when no line is left out', () => {
    expect(excludedTotal({ unvaluedCount: 0, nonEurCount: 0 })).toBeUndefined();
  });

  it('should say "sans cours" when every line left out is unpriced', () => {
    expect(excludedTotal({ unvaluedCount: 2, nonEurCount: 0 })).toEqual({ key: 'excluded.noQuote_other', count: 2 });
    expect(excludedTotal({ unvaluedCount: 1, nonEurCount: 0 })).toEqual({ key: 'excluded.noQuote_one', count: 1 });
  });

  it('should say "hors N lignes" as soon as one line is non-EUR, counting both', () => {
    expect(excludedTotal({ unvaluedCount: 0, nonEurCount: 1 })).toEqual({ key: 'excluded.lines_one', count: 1 });
    expect(excludedTotal({ unvaluedCount: 1, nonEurCount: 1 })).toEqual({ key: 'excluded.lines_other', count: 2 });
  });
});
