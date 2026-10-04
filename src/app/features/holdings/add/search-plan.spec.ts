import { planSearch, resultKey } from './search-plan';

describe('planSearch', () => {
  it('asks nothing below two characters', () => {
    expect(planSearch(' s ', 'ALL')).toEqual([]);
    expect(planSearch('s', 'YAHOO')).toEqual([]);
  });

  it('asks Yahoo Finance and CoinGecko for a name, never Amundi', () => {
    expect(planSearch('  solana ', 'ALL')).toEqual([
      { source: 'YAHOO', query: 'solana' },
      { source: 'COINGECKO', query: 'solana' },
    ]);
  });

  it('asks Yahoo Finance and Amundi for an ISIN, never CoinGecko, compacted and upper-cased', () => {
    expect(planSearch('lu16 8104 3599', 'ALL')).toEqual([
      { source: 'YAHOO', query: 'LU1681043599' },
      { source: 'AMUNDI', query: 'LU1681043599' },
    ]);
  });

  it('asks only Amundi for an employee savings ISIN', () => {
    expect(planSearch('QS0009119224', 'ALL')).toEqual([{ source: 'AMUNDI', query: 'QS0009119224' }]);
  });

  it('asks only the chosen source, whatever the query looks like', () => {
    expect(planSearch('LU1681043599', 'COINGECKO')).toEqual([{ source: 'COINGECKO', query: 'LU1681043599' }]);
    expect(planSearch('QS0009119224', 'YAHOO')).toEqual([{ source: 'YAHOO', query: 'QS0009119224' }]);
  });

  it('never asks Amundi without a full ISIN, even when chosen', () => {
    expect(planSearch('amundi', 'AMUNDI')).toEqual([{ source: 'AMUNDI', query: null }]);
    expect(planSearch('LU1681043599', 'AMUNDI')).toEqual([{ source: 'AMUNDI', query: 'LU1681043599' }]);
  });

  it('keys a result by source and query', () => {
    expect(resultKey('YAHOO', 'msci')).toBe('YAHOO|msci');
  });
});
