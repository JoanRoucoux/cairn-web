import { Component, computed, input } from '@angular/core';

import { UiCard, UiDelta, UiStat } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { PerformanceTotalResponse } from '@core/api-client/cairnAPI.schemas';

import type { ChartRange } from '@shared/chart/chart-range';
import { type ChartPoint } from '@shared/chart/chart-scale';
import { LineChart } from '@shared/chart/line-chart';
import { parisTimeString } from '@shared/format/paris-date';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { SignedMoneyPipe } from '@shared/format/signed-money-pipe';
import { WholeMoneyPipe } from '@shared/format/whole-money-pipe';

@Component({
  selector: 'app-portfolio-hero',
  imports: [LineChart, RatioPipe, SignedMoneyPipe, TranslocoPipe, UiCard, UiDelta, UiStat, WholeMoneyPipe],
  templateUrl: './portfolio-hero.html',
})
export class PortfolioHero {
  readonly total = input.required<PerformanceTotalResponse>();
  readonly range = input.required<ChartRange>();
  readonly points = input.required<ChartPoint[]>();
  readonly unrealizedGainEur = input.required<number | null | undefined>();
  readonly dayChangeEur = input.required<number | null | undefined>();
  readonly lastPriceAt = input.required<string | null | undefined>();
  /** True while the range switched but `performance`/`history` have not settled on the new range yet. */
  readonly loading = input(false);

  protected readonly periodKey = computed(() => `portfolio.hero.period.${this.range()}`);

  protected readonly updatedAt = computed(() => {
    const lastPriceAt = this.lastPriceAt();

    return lastPriceAt ? parisTimeString(lastPriceAt) : undefined;
  });
}
