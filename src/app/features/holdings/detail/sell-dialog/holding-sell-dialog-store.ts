import { Injectable, computed, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';
import { HoldingService } from '@core/api-client/holding/holding.service';

import { parseDecimal } from '@shared/format/parse-decimal';

export type SellOutcome = 'kept' | 'closed';

export type SellResult = { outcome: SellOutcome; holding: HoldingResponse | null };

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

  async save(holdingId: string, quantity: number): Promise<SellResult | null> {
    this.submitting.set(true);
    this.error.set(false);

    try {
      const response = await firstValueFrom(
        this.#holdingsApiClient.sellHolding(holdingId, { quantity }, { observe: 'response' }),
      );

      return response.status === 204
        ? { outcome: 'closed', holding: null }
        : { outcome: 'kept', holding: response.body as HoldingResponse | null };
    } catch {
      this.error.set(true);

      return null;
    } finally {
      this.submitting.set(false);
    }
  }
}
