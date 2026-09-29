import { Injectable, computed, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { HoldingService } from '@core/api-client/holding/holding.service';

import { parseDecimal } from '@shared/format/parse-decimal';

export type SellOutcome = 'kept' | 'closed';

@Injectable()
export class HoldingSellDialogStore {
  #holdingsApiClient = inject(HoldingService);

  readonly quantityText = signal('');
  readonly submitting = signal(false);
  readonly error = signal(false);

  readonly quantity = computed(() => parseDecimal(this.quantityText()));

  valid(heldQuantity: number): boolean {
    const quantity = this.quantity();

    return quantity !== null && quantity > 0 && quantity <= heldQuantity;
  }

  async save(holdingId: string, quantity: number): Promise<SellOutcome | undefined> {
    this.submitting.set(true);
    this.error.set(false);

    try {
      const response = await firstValueFrom(
        this.#holdingsApiClient.sellHolding(holdingId, { quantity }, { observe: 'response' }),
      );

      return response.status === 204 ? 'closed' : 'kept';
    } catch {
      this.error.set(true);

      return undefined;
    } finally {
      this.submitting.set(false);
    }
  }
}
