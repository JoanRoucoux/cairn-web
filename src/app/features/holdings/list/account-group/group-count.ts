import { pluralKey } from '@shared/format/plural-key';

import type { AccountGroup } from '../holding-list-store';

export const isSavings = (group: AccountGroup): boolean => group.accountType === 'SAVINGS';

export const groupCount = (group: AccountGroup): { key: string; count: number } | undefined =>
  isSavings(group) ? undefined : { key: pluralKey('holdings.lineCount', group.lineCount), count: group.lineCount };

export const filteredCount = (rows: number): { key: string; count: number } => ({
  key: pluralKey('holdings.lineCount', rows),
  count: rows,
});

export const unvaluedMeta = (group: AccountGroup): { key: string; count: number } | undefined =>
  group.unvaluedCount > 0
    ? { key: pluralKey('holdings.uncounted.noQuote', group.unvaluedCount), count: group.unvaluedCount }
    : undefined;

export const nonEurMeta = (group: AccountGroup): { key: string; count: number } | undefined =>
  group.nonEurCount > 0
    ? { key: pluralKey('holdings.uncounted.nonEur', group.nonEurCount), count: group.nonEurCount }
    : undefined;

export type CashRowKeys = { line: string; editRow: string; entered: string | null };

export const cashRowKeys = (group: AccountGroup): CashRowKeys =>
  isSavings(group)
    ? {
        line: 'holdings.balance.line',
        editRow: 'holdings.balance.editRow',
        entered: group.balanceAt ? 'holdings.balance.entered' : null,
      }
    : { line: 'holdings.cash.line', editRow: 'holdings.cash.editRow', entered: 'holdings.cash.entered' };
