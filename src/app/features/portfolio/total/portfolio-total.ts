import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { type AsyncState, UiAmount, UiAsync, UiDelta, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { PortfolioResponse } from '@core/api-client/cairnAPI.schemas';

import { pluralKey } from '@shared/format/plural-key';
import { RatioPipe } from '@shared/format/ratio-pipe';

@Component({
  selector: 'app-portfolio-total',
  imports: [RatioPipe, RouterLink, TranslocoPipe, UiAmount, UiAsync, UiDelta, UiSkeleton],
  templateUrl: './portfolio-total.html',
})
export class PortfolioTotal {
  readonly state = input.required<AsyncState>();
  readonly portfolio = input<PortfolioResponse | undefined>();
  readonly retry = output<void>();

  protected readonly staleKey = computed(() => pluralKey('portfolio.total.staleCount', this.portfolio()!.staleCount));
}
