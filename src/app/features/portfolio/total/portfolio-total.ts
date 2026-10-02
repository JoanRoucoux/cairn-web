import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { type AsyncState, UiAmount, UiAsync, UiDelta, UiSkeleton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { PortfolioResponse } from '@core/api-client/cairnAPI.schemas';

import { AmountSeparator } from '@shared/format/amount-separator';
import { excludedTotal } from '@shared/format/excluded-lines';
import { pluralKey } from '@shared/format/plural-key';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { UpperFirstPipe } from '@shared/format/upper-first-pipe';

@Component({
  selector: 'app-portfolio-total',
  imports: [
    AmountSeparator,
    RatioPipe,
    RouterLink,
    TranslocoPipe,
    UiAmount,
    UiAsync,
    UiDelta,
    UiSkeleton,
    UpperFirstPipe,
  ],
  templateUrl: './portfolio-total.html',
})
export class PortfolioTotal {
  readonly state = input.required<AsyncState>();
  readonly portfolio = input<PortfolioResponse | undefined>();
  readonly retry = output<void>();

  protected readonly excluded = computed(() => excludedTotal(this.portfolio()!));
  protected readonly staleKey = computed(() => pluralKey('portfolio.total.staleCount', this.portfolio()!.staleCount));
}
