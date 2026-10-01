import { Component, computed, input, output } from '@angular/core';

import { type AsyncState, UiAmount, UiAsync, UiDelta, UiMeter, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { EnvelopePerformanceResponse } from '@core/api-client/cairnAPI.schemas';

import type { ChartRange } from '@shared/chart/chart-range';
import { RatioPipe } from '@shared/format/ratio-pipe';

@Component({
  selector: 'app-portfolio-envelopes',
  imports: [RatioPipe, TranslocoPipe, UiAmount, UiAsync, UiDelta, UiMeter, UiSkeleton],
  templateUrl: './portfolio-envelopes.html',
})
export class PortfolioEnvelopes {
  readonly state = input.required<AsyncState>();
  readonly envelopes = input<EnvelopePerformanceResponse[]>([]);
  readonly range = input.required<ChartRange>();
  readonly retry = output<void>();

  protected readonly skeletonWidths = [70, 93, 116, 89, 112, 85, 108];

  protected readonly periodKey = computed(() => `portfolio.curve.period.${this.range()}`);
}
