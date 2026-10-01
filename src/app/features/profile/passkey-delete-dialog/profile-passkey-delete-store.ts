import { Injectable, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { SessionService } from '@core/api-client/session/session.service';

@Injectable()
export class ProfilePasskeyDeleteStore {
  #sessionApiClient = inject(SessionService);

  readonly deleting = signal(false);
  readonly refused = signal(false);

  async remove(credentialId: string): Promise<boolean> {
    this.deleting.set(true);
    this.refused.set(false);

    try {
      await firstValueFrom(this.#sessionApiClient.revokePasskey(credentialId));

      return true;
    } catch {
      this.refused.set(true);

      return false;
    } finally {
      this.deleting.set(false);
    }
  }
}
