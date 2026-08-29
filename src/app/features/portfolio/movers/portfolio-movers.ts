import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiDelta } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { MoneyPipe } from '@shared/format/money-pipe';
import { SignedMoneyPipe } from '@shared/format/signed-money-pipe';

const MOVER_COUNT = 4;

@Component({
  selector: 'app-portfolio-movers',
  imports: [MoneyPipe, RouterLink, SignedMoneyPipe, TranslocoPipe, UiDelta],
  templateUrl: './portfolio-movers.html',
})
export class PortfolioMovers {
  readonly holdings = input.required<HoldingResponse[]>();

  protected readonly movers = computed(() =>
    this.holdings()
      .filter(
        (candidate): candidate is HoldingResponse & { dayChangeEur: number } =>
          candidate.dayChangeEur !== null && candidate.dayChangeEur !== undefined,
      )
      .sort((left, right) => Math.abs(right.dayChangeEur) - Math.abs(left.dayChangeEur))
      .slice(0, MOVER_COUNT),
  );
}
