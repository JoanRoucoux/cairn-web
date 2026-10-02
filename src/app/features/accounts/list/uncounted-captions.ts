import { pluralKey } from '@shared/format/plural-key';

import type { AccountView } from './account-list-store';

export type UncountedCaption = { key: string; count: number };

export const uncountedCaptions = (account: AccountView): UncountedCaption[] => [
  ...(account.unvaluedCount > 0
    ? [{ key: pluralKey('accounts.uncounted.noQuote', account.unvaluedCount), count: account.unvaluedCount }]
    : []),
  ...(account.nonEurCount > 0
    ? [{ key: pluralKey('accounts.uncounted.nonEur', account.nonEurCount), count: account.nonEurCount }]
    : []),
];

export const uncountedLink = (account: AccountView): { commands: string[]; queryParams: { compte: string } | null } =>
  account.excludedLineId
    ? { commands: ['/holdings', account.excludedLineId], queryParams: null }
    : { commands: ['/holdings'], queryParams: { compte: account.id } };
