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
