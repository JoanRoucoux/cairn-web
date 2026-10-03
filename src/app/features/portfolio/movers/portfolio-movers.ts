import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { type AsyncState, UiAsync } from '@joanroucoux/cairn-ui/async';
import { UiDelta } from '@joanroucoux/cairn-ui/delta';
import { UiRow } from '@joanroucoux/cairn-ui/row';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { UiRowLink, UiTable, UiTd, UiTh, UiTr } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { RatioPipe } from '@shared/format/ratio-pipe';

@Component({
  selector: 'app-portfolio-movers',
  imports: [
    RatioPipe,
    RouterLink,
    TranslocoPipe,
    UiAmount,
    UiAsync,
    UiDelta,
    UiRow,
    UiRowLink,
    UiSkeleton,
    UiTable,
    UiTd,
    UiTh,
    UiTr,
  ],
  templateUrl: './portfolio-movers.html',
})
export class PortfolioMovers {
  readonly state = input.required<AsyncState>();
  readonly movers = input<HoldingResponse[]>([]);
  readonly retry = output<void>();

  protected readonly skeletonWidths = [140, 177, 214, 171, 208];
}
