import { type Schema, required, schema } from '@angular/forms/signals';

export type Credentials = {
  username: string;
  password: string;
};

// A factory so each page instance gets its own model object.
export const initialCredentials = (): Credentials => ({ username: '', password: '' });

export const credentialsSchema: Schema<Credentials> = schema((credentials) => {
  required(credentials.username);
  required(credentials.password);
});
