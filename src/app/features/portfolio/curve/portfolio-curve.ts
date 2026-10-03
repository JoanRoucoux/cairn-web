import { Component, computed, inject, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { type AsyncState, UiAsync, delayedState } from '@joanroucoux/cairn-ui/async';
import { UiDelta } from '@joanroucoux/cairn-ui/delta';
import { type ChartPoint, UiLineChart } from '@joanroucoux/cairn-ui/line-chart';
import { type SegmentedOption, UiSegmented } from '@joanroucoux/cairn-ui/segmented';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
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
  protected readonly shown = delayedState(this.state);
  readonly blocking = input(false);
  readonly chartReloading = input(false);
  readonly points = input.required<ChartPoint[]>();
  readonly range = input.required<ChartRange>();
  readonly shownRange = input<ChartRange | undefined>();
  readonly rangeChangeEur = input<number | undefined>();
  readonly rangeChangeRatio = input<number | null | undefined>();
  readonly reconstructed = input(false);
  readonly formats = input.required<ChartFormats>();
  readonly startLabel = input.required<string>();
  readonly retry = output<void>();
  readonly rangeChange = output<ChartRange>();

  #transloco = inject(TranslocoService);
  #language = inject(LanguageStore);

  protected readonly periodKey = computed(() => `portfolio.curve.period.${this.shownRange() ?? this.range()}`);

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
