import { type Schema, required, schema } from '@angular/forms/signals';

import type { CreateAccountRequestType } from '@core/api-client/cairnAPI.schemas';

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

export const accountDraftSchema: Schema<AccountDraft> = schema((account) => {
  required(account.name);
  required(account.type);
  required(account.institution);
});
