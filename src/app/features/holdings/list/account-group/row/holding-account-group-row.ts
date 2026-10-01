import { Component, booleanAttribute, computed, input, output } from '@angular/core';

import { UiAmount, UiCellSub, UiTd } from '@joanroucoux/cairn-ui';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { RatioPipe } from '@shared/format/ratio-pipe';

import { isBooklet } from '../../holding-list-store';
import { deltaTone, isMissing } from '../delta-tone';
import { HoldingEnterQuote } from './enter-quote/holding-enter-quote';
import { HoldingLineCell } from './line-cell/holding-line-cell';
import { HoldingQuoteCell } from './quote-cell/holding-quote-cell';

@Component({
  selector: 'tr[app-holding-account-group-row]',
  imports: [HoldingEnterQuote, HoldingLineCell, HoldingQuoteCell, RatioPipe, UiAmount, UiCellSub, UiTd],
  templateUrl: './holding-account-group-row.html',
  host: { 'data-testid': 'holding-row' },
})
export class HoldingAccountGroupRow {
  readonly holding = input.required<HoldingResponse>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly open = input(false, { transform: booleanAttribute });

  readonly enterQuote = output<HoldingResponse>();

  protected readonly decimalPlaces = decimalPlaces;
  protected readonly deltaTone = deltaTone;
  protected readonly booklet = computed(() => isBooklet(this.holding()));
  protected readonly unpriced = computed(() => isMissing(this.holding().price));
  protected readonly unknownDay = computed(() => isMissing(this.holding().dayChangeRatio));
  protected readonly hasGain = computed(() => !isMissing(this.holding().unrealizedGainEur));
  protected readonly hasGainRatio = computed(() => !isMissing(this.holding().unrealizedGainRatio));
}
