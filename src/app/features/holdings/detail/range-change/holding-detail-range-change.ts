import { Component, input } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiDelta } from '@joanroucoux/cairn-ui/delta';
import { TranslocoPipe } from '@jsverse/transloco';

import type { ChartRange } from '@shared/chart/chart-range';
import { AmountSeparator } from '@shared/format/amount-separator';
import { RatioPipe } from '@shared/format/ratio-pipe';

export type RangeChange = { amount: number; ratio: number | null };

@Component({
  selector: 'app-holding-detail-range-change',
  imports: [AmountSeparator, RatioPipe, TranslocoPipe, UiAmount, UiDelta],
  templateUrl: './holding-detail-range-change.html',
  host: { class: 'contents' },
})
export class HoldingDetailRangeChange {
  readonly change = input<RangeChange>();
  readonly range = input.required<ChartRange>();
}
