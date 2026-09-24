import { type Schema, maxLength, required, schema } from '@angular/forms/signals';

import type { FormMessages } from '@shared/forms/form-messages';

export type PasskeyDraft = {
  label: string;
};

// A factory so each dialog instance gets its own model object.
export const initialPasskeyDraft = (): PasskeyDraft => ({ label: '' });

export const passkeyDraftSchema = (messages: FormMessages): Schema<PasskeyDraft> => {
  const labelTooLong = messages.maxLength(64);

  return schema((draft) => {
    required(draft.label, { message: () => messages.required() });
    maxLength(draft.label, 64, { message: () => labelTooLong() });
  });
};
