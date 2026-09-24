import { Component, computed, input } from '@angular/core';

import { UiCard, UiDelta, UiStat } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { EnvelopePerformanceResponse } from '@core/api-client/cairnAPI.schemas';

import type { ChartRange } from '@shared/chart/chart-range';
import { MoneyPipe } from '@shared/format/money-pipe';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { SignedMoneyPipe } from '@shared/format/signed-money-pipe';

@Component({
  selector: 'app-envelope-tiles',
  imports: [MoneyPipe, RatioPipe, SignedMoneyPipe, TranslocoPipe, UiCard, UiDelta, UiStat],
  templateUrl: './envelope-tiles.html',
})
export class EnvelopeTiles {
  readonly envelopes = input.required<EnvelopePerformanceResponse[]>();
  readonly range = input.required<ChartRange>();

  protected readonly periodKey = computed(() => `portfolio.hero.period.${this.range()}`);
}
