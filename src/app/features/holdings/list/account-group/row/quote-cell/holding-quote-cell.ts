import { Component, computed, input, output } from '@angular/core';

import { UiAmount, UiCellSub } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import { isMissing } from '../../../../delta-tone';
import { HoldingEnterQuote } from '../enter-quote/holding-enter-quote';

@Component({
  selector: 'td[app-holding-quote-cell]',
  imports: [HoldingEnterQuote, ShortDatePipe, TranslocoPipe, UiAmount, UiCellSub],
  templateUrl: './holding-quote-cell.html',
})
export class HoldingQuoteCell {
  readonly holding = input.required<HoldingResponse>();

  readonly enterQuote = output<HoldingResponse>();

  protected readonly foreignCurrency = computed(() => {
    const currency = this.holding().priceCurrency;

    return currency && currency !== 'EUR' ? currency : undefined;
  });
  protected readonly unpriced = computed(() => isMissing(this.holding().price));
}
