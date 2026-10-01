import { Component, computed, inject, input, output } from '@angular/core';

import {
  type AsyncState,
  type ChartPoint,
  type SegmentedOption,
  UiAmount,
  UiAsync,
  UiDelta,
  UiLineChart,
  UiSegmented,
  UiSkeleton,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LanguageStore } from '@core/i18n/language-store';

import type { ChartFormats } from '@shared/chart/chart-formats';
import { CHART_RANGES, type ChartRange } from '@shared/chart/chart-range';
import { AmountSeparator } from '@shared/format/amount-separator';
import { RatioPipe } from '@shared/format/ratio-pipe';

@Component({
  selector: 'app-portfolio-curve',
  imports: [
    AmountSeparator,
    RatioPipe,
    TranslocoPipe,
    UiAmount,
    UiAsync,
    UiDelta,
    UiLineChart,
    UiSegmented,
    UiSkeleton,
  ],
  templateUrl: './portfolio-curve.html',
})
export class PortfolioCurve {
  readonly state = input.required<AsyncState>();
  readonly blocking = input(false);
  readonly points = input.required<ChartPoint[]>();
  readonly range = input.required<ChartRange>();
  readonly rangeChangeEur = input<number | undefined>();
  readonly rangeChangeRatio = input<number | null | undefined>();
  readonly reconstructed = input(false);
  readonly formats = input.required<ChartFormats>();
  readonly startLabel = input.required<string>();
  readonly retry = output<void>();
  readonly rangeChange = output<ChartRange>();

  #transloco = inject(TranslocoService);
  #language = inject(LanguageStore);

  protected readonly periodKey = computed(() => `portfolio.curve.period.${this.range()}`);

  protected readonly rangeOptions = computed<SegmentedOption[]>(() => {
    this.#language.activeLang();
    return CHART_RANGES.map((value) => ({ value, label: this.#transloco.translate(`chart.range.${value}`) }));
  });

  protected readonly chartLabelKey = computed(() =>
    this.points().length === 0 ? 'portfolio.curve.label' : 'portfolio.curve.summary',
  );

  protected readonly chartLabelParams = computed(() => {
    const points = this.points();

    if (points.length === 0) {
      return {};
    }

    const first = points[0] as ChartPoint;
    const last = points.at(-1) as ChartPoint;
    const { time, delta } = this.formats();

    return { from: time(first.t), to: time(last.t), change: delta(last.v - first.v) };
  });

  protected onRangeChange(value: string): void {
    this.rangeChange.emit(value as ChartRange);
  }
}
