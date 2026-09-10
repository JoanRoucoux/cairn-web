import { type Schema, required, schema } from '@angular/forms/signals';

import type { CreateAccountRequestType } from '@core/api-client/cairnAPI.schemas';

import type { FormMessages } from '@shared/forms/form-messages';

export type AccountDraft = {
  name: string;
  type: CreateAccountRequestType | '';
  institution: string;
};

// A factory so each page instance gets its own model object.
export const initialAccountDraft = (): AccountDraft => ({
  name: '',
  type: '',
  institution: '',
});

export const accountDraftSchema = (messages: FormMessages): Schema<AccountDraft> =>
  schema((account) => {
    required(account.name, { message: () => messages.required() });
    required(account.type, { message: () => messages.required() });
    required(account.institution, { message: () => messages.required() });
  });
