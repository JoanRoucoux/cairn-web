import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import { PasskeyCeremony } from '@core/webauthn/passkey-ceremony';

import { formMessages } from '@shared/forms/form-messages';

import { environment } from '@environments/environment';

import { credentialsSchema, initialCredentials } from './credentials';

@Injectable()
export class LoginStore {
  #http = inject(HttpClient);
  #passkeyCeremony = inject(PasskeyCeremony);

  readonly #model = signal(initialCredentials());

  readonly #messages = formMessages();

  readonly form = form(this.#model, credentialsSchema(this.#messages));

  readonly refused = signal(false);
  readonly failed = signal(false);

  readonly passkeySubmitting = signal(false);
  readonly passkeyRefused = signal(false);
  readonly passkeyUnsupported = signal(false);
  readonly passkeyFailed = signal(false);

  async signIn(): Promise<boolean> {
    this.#clearOutcomes();
    let signedIn = false;

    await submit(this.form, async () => {
      const credentials = this.#model();
      // Form encoding, not JSON: Spring's login filter reads request parameters, not a JSON body.
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

  clearPasswordOutcome(): void {
    this.refused.set(false);
    this.failed.set(false);
  }

  async signInWithPasskey(): Promise<boolean> {
    this.#clearOutcomes();
    this.passkeySubmitting.set(true);

    try {
      const outcome = await this.#passkeyCeremony.authenticate();

      switch (outcome) {
        case 'ok':
          return true;
        case 'cancelled':
        case 'refused':
          this.passkeyRefused.set(true);
          return false;
        case 'unsupported':
          this.passkeyUnsupported.set(true);
          return false;
        case 'failed':
          this.passkeyFailed.set(true);
          return false;
      }
    } finally {
      this.passkeySubmitting.set(false);
    }
  }

  #clearOutcomes(): void {
    this.refused.set(false);
    this.failed.set(false);
    this.passkeyRefused.set(false);
    this.passkeyUnsupported.set(false);
    this.passkeyFailed.set(false);
  }
}
