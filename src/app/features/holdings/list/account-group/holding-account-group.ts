import { Component, booleanAttribute, input, output } from '@angular/core';

import { UiAmount, UiCellSub, UiGroup, UiGroupCell, UiRowLink, UiTd, UiTr } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import type { AccountGroup } from '../holding-list-store';
import { groupCount } from './group-count';
import { HoldingAccountGroupRow } from './row/holding-account-group-row';

@Component({
  selector: 'tbody[app-holding-account-group]',
  imports: [HoldingAccountGroupRow, TranslocoPipe, UiAmount, UiCellSub, UiGroupCell, UiRowLink, UiTd, UiTr],
  templateUrl: './holding-account-group.html',
  hostDirectives: [UiGroup],
  host: { 'data-testid': 'account-group' },
})
export class HoldingAccountGroup {
  readonly group = input.required<AccountGroup>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly selectedHoldingId = input<string | undefined>(undefined);

  readonly editCash = output<string>();

  protected readonly groupCount = groupCount;
}
