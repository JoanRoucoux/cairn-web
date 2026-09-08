import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { form } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import { environment } from '@environments/environment';

import { credentialsSchema, initialCredentials } from './credentials';

@Injectable()
export class LoginStore {
  #http = inject(HttpClient);

  readonly #model = signal(initialCredentials());

  readonly form = form(this.#model, credentialsSchema);

  readonly submitting = signal(false);
  /** The password was wrong. An outcome, not a breakdown, and the only one worth naming. */
  readonly refused = signal(false);
  readonly failed = signal(false);

  async signIn(): Promise<boolean> {
    this.submitting.set(true);
    this.refused.set(false);
    this.failed.set(false);

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
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.refused.set(true);
      } else {
        this.failed.set(true);
      }
      return false;
    } finally {
      this.submitting.set(false);
    }
  }
}
