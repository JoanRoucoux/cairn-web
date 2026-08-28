import { type Schema, required, schema } from '@angular/forms/signals';

export type AccountDraft = {
  name: string;
  type: string;
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
