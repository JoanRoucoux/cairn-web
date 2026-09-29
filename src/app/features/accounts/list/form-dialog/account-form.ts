import { type Schema, required, schema } from '@angular/forms/signals';

import type { AccountType } from '@core/api-client/cairnAPI.schemas';

import type { FormMessages } from '@shared/forms/form-messages';

export type AccountDraft = {
  name: string;
  type: AccountType | '';
  institution: string;
};

export type AccountDraftSource = { name: string; type: AccountType; institution: string };

export const initialAccountDraft = (account?: AccountDraftSource): AccountDraft => ({
  name: account?.name ?? '',
  type: account?.type ?? '',
  institution: account?.institution ?? '',
});

export const accountDraftSchema = (messages: FormMessages): Schema<AccountDraft> =>
  schema((account) => {
    required(account.name, { message: () => messages.required() });
    required(account.type, { message: () => messages.required() });
    required(account.institution, { message: () => messages.required() });
  });
