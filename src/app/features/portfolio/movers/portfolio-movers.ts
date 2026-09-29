import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  type AsyncState,
  UiAmount,
  UiAsync,
  UiDelta,
  UiSkeleton,
  UiTable,
  UiTd,
  UiTh,
  UiTr,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { RatioPipe } from '@shared/format/ratio-pipe';

@Component({
  selector: 'app-portfolio-movers',
  imports: [RatioPipe, RouterLink, TranslocoPipe, UiAmount, UiAsync, UiDelta, UiSkeleton, UiTable, UiTd, UiTh, UiTr],
  templateUrl: './portfolio-movers.html',
})
export class PortfolioMovers {
  readonly state = input.required<AsyncState>();
  readonly movers = input<HoldingResponse[]>([]);
  readonly retry = output<void>();
}
