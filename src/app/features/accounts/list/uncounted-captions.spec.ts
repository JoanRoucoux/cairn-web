import type { AccountView } from './account-list-store';
import { uncountedCaptions, uncountedLink } from './uncounted-captions';

const account: AccountView = {
  id: 'a1',
  name: 'PER',
  type: 'PER',
  institution: '',
  valueEur: 100,
  share: 0.5,
  lineCount: 5,
  unvaluedCount: 0,
  nonEurCount: 0,
  excludedLineId: null,
  balanceAt: null,
  empty: false,
};

describe('uncounted captions', () => {
  it('should have no caption when every line is counted', () => {
    expect(uncountedCaptions(account)).toEqual([]);
  });

  it('should name the unpriced lines, singular then plural', () => {
    expect(uncountedCaptions({ ...account, unvaluedCount: 1 })).toEqual([
      { key: 'accounts.uncounted.noQuote_one', count: 1 },
    ]);
    expect(uncountedCaptions({ ...account, unvaluedCount: 2 })).toEqual([
      { key: 'accounts.uncounted.noQuote_other', count: 2 },
    ]);
  });

  it('should name the non-EUR lines, and both when both are left out', () => {
    expect(uncountedCaptions({ ...account, nonEurCount: 1 })).toEqual([
      { key: 'accounts.uncounted.nonEur_one', count: 1 },
    ]);
    expect(uncountedCaptions({ ...account, unvaluedCount: 1, nonEurCount: 3 })).toEqual([
      { key: 'accounts.uncounted.noQuote_one', count: 1 },
      { key: 'accounts.uncounted.nonEur_other', count: 3 },
    ]);
  });

  it('should lead to the line when only one is left out', () => {
    expect(uncountedLink({ ...account, unvaluedCount: 1, excludedLineId: 'h9' })).toEqual({
      commands: ['/holdings', 'h9'],
      queryParams: null,
    });
  });

  it('should lead to the account in Lignes when several are left out', () => {
    expect(uncountedLink({ ...account, unvaluedCount: 2 })).toEqual({
      commands: ['/holdings'],
      queryParams: { compte: 'a1' },
    });
  });
});
