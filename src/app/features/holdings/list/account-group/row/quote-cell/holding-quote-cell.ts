import { Component, computed, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiCellSub } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import { foreignCurrencyOf } from '../../../../foreign-currency';
import { isMissing } from '../../../../is-missing';
import { HoldingChangeListing } from '../change-listing/holding-change-listing';
import { HoldingEnterQuote } from '../enter-quote/holding-enter-quote';

@Component({
  selector: 'td[app-holding-quote-cell]',
  imports: [HoldingChangeListing, HoldingEnterQuote, ShortDatePipe, TranslocoPipe, UiAmount, UiCellSub],
  templateUrl: './holding-quote-cell.html',
})
export class HoldingQuoteCell {
  readonly holding = input.required<HoldingResponse>();

  readonly enterQuote = output<HoldingResponse>();
  readonly changeListing = output<HoldingResponse>();

  protected readonly foreignCurrency = computed(() => foreignCurrencyOf(this.holding()));
  protected readonly unpriced = computed(() => isMissing(this.holding().price));
}
