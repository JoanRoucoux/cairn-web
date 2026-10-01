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

  async signOut(): Promise<void> {
    // A failed logout must not strand the user on a screen they can no longer use: the caller
    // navigates away either way, and the server session expires on its own.
    await firstValueFrom(this.#http.post('/logout', null).pipe(catchError(() => of(null))));
  }
}
