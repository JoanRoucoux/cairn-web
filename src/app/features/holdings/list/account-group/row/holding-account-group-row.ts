import { Component, booleanAttribute, computed, input, output } from '@angular/core';

import { UiAmount, UiCellSub, UiDelta, UiTd } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { RatioPipe } from '@shared/format/ratio-pipe';

import { foreignCurrencyOf } from '../../../foreign-currency';
import { isMissing } from '../../../is-missing';
import { HoldingEnterQuote } from './enter-quote/holding-enter-quote';
import { HoldingLineCell } from './line-cell/holding-line-cell';
import { HoldingQuoteCell } from './quote-cell/holding-quote-cell';

@Component({
  selector: 'tr[app-holding-account-group-row]',
  imports: [
    HoldingEnterQuote,
    HoldingLineCell,
    HoldingQuoteCell,
    RatioPipe,
    TranslocoPipe,
    UiAmount,
    UiCellSub,
    UiDelta,
    UiTd,
  ],
  templateUrl: './holding-account-group-row.html',
  host: { 'data-testid': 'holding-row' },
})
export class HoldingAccountGroupRow {
  readonly holding = input.required<HoldingResponse>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly open = input(false, { transform: booleanAttribute });

  readonly enterQuote = output<HoldingResponse>();
  readonly changeListing = output<HoldingResponse>();

  protected readonly decimalPlaces = decimalPlaces;
  protected readonly foreign = computed(() => foreignCurrencyOf(this.holding()) !== undefined);
  protected readonly unpriced = computed(() => isMissing(this.holding().price));
  protected readonly unknownDay = computed(() => isMissing(this.holding().dayChangeRatio));
  protected readonly hasGain = computed(() => !isMissing(this.holding().unrealizedGainEur));
  protected readonly hasGainRatio = computed(() => !isMissing(this.holding().unrealizedGainRatio));
}
