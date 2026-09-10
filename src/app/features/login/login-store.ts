import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import { formMessages } from '@shared/forms/form-messages';

import { environment } from '@environments/environment';

import { credentialsSchema, initialCredentials } from './credentials';

@Injectable()
export class LoginStore {
  #http = inject(HttpClient);

  readonly #model = signal(initialCredentials());

  readonly #messages = formMessages();

  readonly form = form(this.#model, credentialsSchema(this.#messages));

  /** The password was wrong. An outcome, not a breakdown, and the only one worth naming. */
  readonly refused = signal(false);
  readonly failed = signal(false);

  // Returns true once the session exists.
  async signIn(): Promise<boolean> {
    this.refused.set(false);
    this.failed.set(false);
    let signedIn = false;

    // submit() marks every field as touched and skips the request while the form is invalid.
    await submit(this.form, async () => {
      const credentials = this.#model();
      // Form encoding, not JSON: Spring's UsernamePasswordAuthenticationFilter reads request
      // parameters, and would see an empty username in a JSON body.
      const body = new URLSearchParams({
        username: credentials.username,
        password: credentials.password,
      }).toString();

      try {
        await firstValueFrom(
          this.#http.post(`${environment.apiBaseUrl}/authenticate`, body, {
            headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
          }),
        );
        signedIn = true;
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.refused.set(true);
        } else {
          this.failed.set(true);
        }
      }
    });

    return signedIn;
  }
}
