import { Injectable, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { HoldingService } from '@core/api-client/holding/holding.service';

@Injectable()
export class HoldingDeleteStore {
  #holdingsApiClient = inject(HoldingService);

  readonly deleting = signal(false);
  readonly error = signal(false);

  async remove(holdingId: string): Promise<boolean> {
    this.deleting.set(true);
    this.error.set(false);

    try {
      await firstValueFrom(this.#holdingsApiClient.deleteHolding(holdingId));

      return true;
    } catch {
      this.error.set(true);

      return false;
    } finally {
      this.deleting.set(false);
    }
  }
}
