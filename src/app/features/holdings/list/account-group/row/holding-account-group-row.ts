import { Component, booleanAttribute, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiBadge, UiDelta, UiTd, UiTr } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

@Component({
  selector: 'app-holding-account-group-row',
  imports: [RatioPipe, RouterLink, ShortDatePipe, TranslocoPipe, UiAmount, UiBadge, UiDelta, UiTd, UiTr],
  templateUrl: './holding-account-group-row.html',
  host: { class: 'contents' },
})
export class HoldingAccountGroupRow {
  readonly holding = input.required<HoldingResponse>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly selected = input(false, { transform: booleanAttribute });

  protected readonly decimalPlaces = decimalPlaces;
}
