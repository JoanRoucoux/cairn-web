import { Component, booleanAttribute, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiDelta, UiRow, UiTable, UiTd, UiTh, UiTr } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { decimalPlaces } from '@shared/format/decimal-places';
import { pluralKey } from '@shared/format/plural-key';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

import type { AccountGroup } from '../holding-list-store';
import { HoldingAccountGroupRow } from './row/holding-account-group-row';

@Component({
  selector: 'app-holding-account-group',
  imports: [
    HoldingAccountGroupRow,
    RatioPipe,
    RouterLink,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiDelta,
    UiRow,
    UiTable,
    UiTd,
    UiTh,
    UiTr,
  ],
  templateUrl: './holding-account-group.html',
})
export class HoldingAccountGroup {
  readonly group = input.required<AccountGroup>();
  readonly expanded = input(false);
  readonly compact = input(false, { transform: booleanAttribute });
  readonly selectedHoldingId = input<string | undefined>(undefined);

  readonly editCash = output<string>();

  protected readonly decimalPlaces = decimalPlaces;
  protected readonly pluralKey = pluralKey;
}
