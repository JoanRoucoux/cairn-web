import { pluralKey } from '@shared/format/plural-key';

import type { AccountView } from './account-list-store';

export const linesLabel = (account: AccountView): string => {
  if (account.lineCount === 0) {
    return 'accounts.noLine';
  }

  return pluralKey(account.type === 'SAVINGS' ? 'accounts.bookletCount' : 'accounts.lineCount', account.lineCount);
};
