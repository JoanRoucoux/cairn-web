import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { firstValueFrom } from 'rxjs';

export type PasskeyOutcome = 'ok' | 'cancelled' | 'refused' | 'unsupported' | 'failed';

const isDismissal = (error: unknown): boolean =>
  error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'AbortError');

const isSupported = (): boolean =>
  typeof PublicKeyCredential !== 'undefined' &&
  typeof PublicKeyCredential.parseRequestOptionsFromJSON === 'function' &&
  typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function';

@Injectable({ providedIn: 'root' })
export class PasskeyCeremony {
  #http = inject(HttpClient);

  async authenticate(): Promise<PasskeyOutcome> {
    if (!isSupported()) {
      return 'unsupported';
    }

    try {
      const optionsJSON = await firstValueFrom(this.#http.post('/webauthn/authenticate/options', null));
      const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(
        optionsJSON as PublicKeyCredentialRequestOptionsJSON,
      );

      let credential: Credential | null;
      try {
        credential = await navigator.credentials.get({ publicKey });
      } catch (error) {
        return isDismissal(error) ? 'cancelled' : 'failed';
      }

      await firstValueFrom(this.#http.post('/login/webauthn', (credential as PublicKeyCredential).toJSON()));

      return 'ok';
    } catch (error) {
      return this.#isUnauthorized(error) ? 'refused' : 'failed';
    }
  }

  async register(label: string): Promise<PasskeyOutcome> {
    if (!isSupported()) {
      return 'unsupported';
    }

    try {
      const optionsJSON = await firstValueFrom(this.#http.post('/webauthn/register/options', null));
      const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(
        optionsJSON as PublicKeyCredentialCreationOptionsJSON,
      );

      let credential: Credential | null;
      try {
        credential = await navigator.credentials.create({ publicKey });
      } catch (error) {
        return isDismissal(error) ? 'cancelled' : 'failed';
      }

      const response = await firstValueFrom(
        this.#http.post<{ success: boolean }>('/webauthn/register', {
          publicKey: { credential: (credential as PublicKeyCredential).toJSON(), label },
        }),
      );

      return response.success ? 'ok' : 'failed';
    } catch {
      return 'failed';
    }
  }

  #isUnauthorized(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'status' in error && error.status === 401;
  }
}
