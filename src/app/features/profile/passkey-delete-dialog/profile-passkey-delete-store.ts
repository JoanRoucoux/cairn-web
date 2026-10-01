import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { SessionService } from '@core/api-client/session/session.service';

@Injectable()
export class ProfilePasskeyDeleteStore {
  #sessionApiClient = inject(SessionService);

  readonly deleting = signal(false);
  readonly refused = signal(false);
  readonly failed = signal(false);

  async remove(credentialId: string): Promise<boolean> {
    this.deleting.set(true);
    this.refused.set(false);
    this.failed.set(false);

    try {
      await firstValueFrom(this.#sessionApiClient.revokePasskey(credentialId));

      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.refused.set(true);
      } else {
        this.failed.set(true);
      }

      return false;
    } finally {
      this.deleting.set(false);
    }
  }
}
