import { Injectable, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { InstrumentService } from '@core/api-client/instrument/instrument.service';

@Injectable()
export class InstrumentDeleteStore {
  #instrumentsApiClient = inject(InstrumentService);

  readonly deleting = signal(false);
  readonly error = signal(false);

  async remove(instrumentId: string): Promise<boolean> {
    this.deleting.set(true);
    this.error.set(false);

    try {
      await firstValueFrom(this.#instrumentsApiClient.deleteInstrument(instrumentId));

      return true;
    } catch {
      this.error.set(true);

      return false;
    } finally {
      this.deleting.set(false);
    }
  }
}
