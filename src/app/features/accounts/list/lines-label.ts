import { pluralKey } from '@shared/format/plural-key';

import type { AccountView } from './account-list-store';

export type LinesLabel = { key: string; count: number; date: string | null };

export const linesLabel = (account: AccountView): LinesLabel | null => {
  if (account.type === 'SAVINGS') {
    return account.balanceAt ? { key: 'accounts.balanceAt', count: 0, date: account.balanceAt } : null;
  }

  return account.lineCount === 0
    ? { key: 'accounts.noLine', count: 0, date: null }
    : { key: pluralKey('accounts.lineCount', account.lineCount), count: account.lineCount, date: null };
};
