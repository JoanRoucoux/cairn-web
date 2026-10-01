import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

@Component({
  selector: 'dl[app-holding-detail-facts]',
  imports: [ShortDatePipe, TranslocoPipe, UiAmount],
  templateUrl: './holding-detail-facts.html',
  host: {
    class:
      'flex flex-col max-lg:rounded-container max-lg:bg-(--card) max-lg:px-(--inset-card) max-lg:py-1 max-lg:shadow-[inset_0_0_0_1px_var(--border)] lg:shadow-[inset_0_1px_0_var(--hairline)]',
  },
})
export class HoldingDetailFacts {
  readonly holding = input.required<HoldingResponse>();
  readonly priceSourceLabel = input.required<string>();

  readonly #locale = inject(LOCALE_ID);

  protected readonly decimalPlaces = decimalPlaces;

  protected readonly crypto = computed(() => this.holding().assetClass === 'CRYPTO');

  protected readonly quoteTime = computed(() => {
    const { assetClass, priceFetchedAt, stale } = this.holding();

    if (stale || assetClass === 'FUND' || !priceFetchedAt) {
      return null;
    }

    return new Intl.DateTimeFormat(this.#locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(new Date(priceFetchedAt));
  });
}
