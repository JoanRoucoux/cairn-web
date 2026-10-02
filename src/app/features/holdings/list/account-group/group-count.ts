import { pluralKey } from '@shared/format/plural-key';

import type { AccountGroup } from '../holding-list-store';

export const groupCount = (group: AccountGroup): { key: string; count: number } =>
  group.accountType === 'SAVINGS'
    ? { key: pluralKey('holdings.bookletCount', group.bookletCount), count: group.bookletCount }
    : { key: pluralKey('holdings.lineCount', group.lineCount), count: group.lineCount };

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
