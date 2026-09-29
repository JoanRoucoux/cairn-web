import { Injectable, computed, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { HoldingService } from '@core/api-client/holding/holding.service';

import { parseDecimal } from '@shared/format/parse-decimal';

@Injectable()
export class HoldingBuyDialogStore {
  #holdingsApiClient = inject(HoldingService);

  readonly quantityText = signal('');
  readonly priceText = signal('');
  readonly submitting = signal(false);
  readonly error = signal(false);

  readonly quantity = computed(() => parseDecimal(this.quantityText()));
  readonly price = computed(() => parseDecimal(this.priceText()));

  readonly valid = computed(() => (this.quantity() ?? 0) > 0 && (this.price() ?? 0) > 0);

  async save(holdingId: string): Promise<boolean> {
    if (!this.valid()) {
      return false;
    }

    this.submitting.set(true);
    this.error.set(false);

    try {
      await firstValueFrom(
        this.#holdingsApiClient.buyHolding(holdingId, {
          quantity: this.quantity() as number,
          unitPrice: this.price() as number,
        }),
      );

      return true;
    } catch {
      this.error.set(true);

      return false;
    } finally {
      this.submitting.set(false);
    }
  }
}
