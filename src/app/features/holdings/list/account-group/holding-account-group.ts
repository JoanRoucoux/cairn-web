import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiBadge, UiButton, UiDelta, UiTable, UiTd, UiTh } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { decimalPlaces } from '@shared/format/decimal-places';

import type { AccountGroup } from '../holding-list-store';

@Component({
  selector: 'app-holding-account-group',
  imports: [RouterLink, TranslocoPipe, UiAmount, UiBadge, UiButton, UiDelta, UiTable, UiTd, UiTh],
  templateUrl: './holding-account-group.html',
})
export class HoldingAccountGroup {
  readonly group = input.required<AccountGroup>();
  readonly expanded = input(false);

  readonly edit = output<HoldingResponse>();
  readonly remove = output<HoldingResponse>();
  readonly editCash = output<string>();

  protected readonly decimalPlaces = decimalPlaces;
}
