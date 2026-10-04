import { Component, computed, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { type AsyncState, UiAsync } from '@joanroucoux/cairn-ui/async';
import { UiDelta } from '@joanroucoux/cairn-ui/delta';
import { UiMeter } from '@joanroucoux/cairn-ui/meter';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { TranslocoPipe } from '@jsverse/transloco';

import type { EnvelopePerformanceResponse } from '@core/api-client/cairnAPI.schemas';

import type { ChartRange } from '@shared/chart/chart-range';
import { AmountSeparator } from '@shared/format/amount-separator';
import { RatioPipe } from '@shared/format/ratio-pipe';

import { periodLabel } from '../period-label';

@Component({
  selector: 'app-portfolio-envelopes',
  imports: [AmountSeparator, RatioPipe, TranslocoPipe, UiAmount, UiAsync, UiDelta, UiMeter, UiSkeleton],
  templateUrl: './portfolio-envelopes.html',
})
export class PortfolioEnvelopes {
  readonly state = input.required<AsyncState>();
  readonly envelopes = input<EnvelopePerformanceResponse[]>([]);
  readonly range = input.required<ChartRange>();
  readonly since = input<string | null>(null);
  readonly retry = output<void>();

  protected readonly skeletonWidths = [70, 93, 116, 89, 112, 85, 108];

  protected readonly period = computed(() => periodLabel(this.range(), this.since()));
}
