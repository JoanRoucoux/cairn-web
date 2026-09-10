import { type Schema, required, schema } from '@angular/forms/signals';

import type { FormMessages } from '@shared/forms/form-messages';

export type Credentials = {
  username: string;
  password: string;
};

// A factory so each page instance gets its own model object.
export const initialCredentials = (): Credentials => ({ username: '', password: '' });

export const credentialsSchema = (messages: FormMessages): Schema<Credentials> =>
  schema((credentials) => {
    required(credentials.username, { message: () => messages.required() });
    required(credentials.password, { message: () => messages.required() });
  });
