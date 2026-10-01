import { Injectable, inject, signal } from '@angular/core';

import { SessionStore } from '@core/session/session-store';

@Injectable()
export class ProfilePasskeyDeleteStore {
  #session = inject(SessionStore);

  readonly deleting = signal(false);
  readonly refused = signal(false);

  async remove(credentialId: string): Promise<boolean> {
    this.deleting.set(true);
    this.refused.set(false);

    try {
      const removed = await this.#session.revokePasskey(credentialId);
      this.refused.set(!removed);

      return removed;
    } finally {
      this.deleting.set(false);
    }
  }
}
