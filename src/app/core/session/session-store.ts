import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { catchError, firstValueFrom, of } from 'rxjs';

import { SessionService } from '@core/api-client/session/session.service';

const NO_OWNER = { displayName: '', initials: '' };

@Injectable({ providedIn: 'root' })
export class SessionStore {
  #http = inject(HttpClient);
  #sessionApiClient = inject(SessionService);

  readonly #session = rxResource({
    stream: () => this.#sessionApiClient.getSession(),
  });

  readonly owner = computed(() => this.#session.value() ?? NO_OWNER);
  readonly passkeys = computed(() => this.#session.value()?.passkeys ?? []);

  // Returns false when the server refused: the last passkey cannot be revoked without locking
  // the owner out for good, and the screen has to say so rather than pretend it worked.
  async revokePasskey(credentialId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.#sessionApiClient.revokePasskey(credentialId));
      this.#session.reload();

      return true;
    } catch {
      return false;
    }
  }

  async signOut(): Promise<void> {
    // A failed logout must not strand the user on a screen they can no longer use: the caller
    // navigates away either way, and the server session expires on its own.
    await firstValueFrom(this.#http.post('/logout', null).pipe(catchError(() => of(null))));
  }
}
