import { Component, computed, inject } from '@angular/core';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { type SegmentedOption, UiCard, UiDelta, UiSegmented, UiSkeleton } from 'cairn-ui';

import { CHART_RANGES, type ChartRange } from '@shared/chart/chart-range';
import { LineChart } from '@shared/chart/line-chart';
import { MoneyPipe } from '@shared/format/money-pipe';
import { RelativeDatePipe } from '@shared/format/relative-date-pipe';
import { SignedMoneyPipe } from '@shared/format/signed-money-pipe';

import { HoldingDetailStore } from './holding-detail-store';

@Component({
  selector: 'app-holding-detail-page',
  imports: [
    LineChart,
    MoneyPipe,
    RelativeDatePipe,
    SignedMoneyPipe,
    TranslocoPipe,
    UiCard,
    UiDelta,
    UiSegmented,
    UiSkeleton,
  ],
  templateUrl: './holding-detail-page.html',
})
export class HoldingDetailPage {
  #store = inject(HoldingDetailStore);
  #transloco = inject(TranslocoService);

  protected readonly holding = this.#store.holding;
  protected readonly holdings = this.#store.holdings;
  protected readonly instrument = this.#store.instrument;
  protected readonly points = this.#store.points;
  protected readonly range = this.#store.range;

  protected readonly rangeOptions = computed<SegmentedOption[]>(() =>
    CHART_RANGES.map((value) => ({ value, label: this.#transloco.translate(`portfolio.range.${value}`) })),
  );

  // The library types the option value as `string`; every option here is built from CHART_RANGES.
  protected setRange(value: string): void {
    this.range.set(value as ChartRange);
  }
}
