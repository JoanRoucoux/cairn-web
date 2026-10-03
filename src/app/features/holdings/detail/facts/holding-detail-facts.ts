import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiFact, UiFacts } from '@joanroucoux/cairn-ui/fact';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { ShortDatePipe } from '@shared/format/short-date-pipe';
import { injectDesktop } from '@shared/layout/desktop-media';

const PARIS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' });

@Component({
  selector: 'app-holding-detail-facts',
  imports: [ShortDatePipe, TranslocoPipe, UiAmount, UiCard, UiFact, UiFacts],
  templateUrl: './holding-detail-facts.html',
  host: { class: 'block' },
})
export class HoldingDetailFacts {
  readonly holding = input.required<HoldingResponse>();
  readonly priceSourceLabel = input.required<string>();

  readonly #locale = inject(LOCALE_ID);

  protected readonly desktop = injectDesktop();

  protected readonly decimalPlaces = decimalPlaces;

  protected readonly crypto = computed(() => this.holding().assetClass === 'CRYPTO');
  protected readonly priceSubKey = computed(() => {
    if (this.holding().stale) {
      return 'holdings.staleLate';
    }

    return this.quoteTime() ? 'holdings.detail.quoteAt' : 'holdings.detail.quoteOn';
  });

  protected readonly identifier = computed(() =>
    this.crypto() ? this.holding().symbol || this.holding().isin : this.holding().isin,
  );

  protected readonly quoteTime = computed(() => {
    const { assetClass, priceAsOf, priceFetchedAt, stale } = this.holding();

    if (stale || assetClass === 'FUND' || !priceFetchedAt) {
      return null;
    }

    const fetched = new Date(priceFetchedAt);

    if (PARIS_DAY.format(fetched) !== priceAsOf) {
      return null;
    }

    return new Intl.DateTimeFormat(this.#locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(fetched);
  });
}
