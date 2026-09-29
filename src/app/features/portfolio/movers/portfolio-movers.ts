import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiDelta } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

const MOVER_COUNT = 4;

@Component({
  selector: 'app-portfolio-movers',
  imports: [RouterLink, TranslocoPipe, UiAmount, UiDelta],
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
