import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiDelta, UiTable, UiTd, UiTh } from 'cairn-ui';

import { MoneyPipe } from '@shared/format/money-pipe';
import { SignedMoneyPipe } from '@shared/format/signed-money-pipe';

import type { AccountGroup } from '../holding-list-store';

@Component({
  selector: 'app-holding-account-group',
  imports: [MoneyPipe, RouterLink, SignedMoneyPipe, TranslocoPipe, UiDelta, UiTable, UiTd, UiTh],
  templateUrl: './holding-account-group.html',
})
export class HoldingAccountGroup {
  readonly group = input.required<AccountGroup>();
  readonly expanded = input(false);
}
