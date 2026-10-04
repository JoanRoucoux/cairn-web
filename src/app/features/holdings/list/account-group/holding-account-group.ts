import { Component, booleanAttribute, computed, input, output } from '@angular/core';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiFlipItem, UiHighlight } from '@joanroucoux/cairn-ui/motion';
import { UiCellSub, UiGroup, UiGroupCell, UiRowLink, UiTd, UiTr } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe } from '@jsverse/transloco';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import type { HoldingChange } from '../../holding-changes';
import type { AccountGroup } from '../holding-list-store';
import { cashRowKeys } from './group-count';
import { injectGroupMeta } from './group-meta';
import { HoldingAccountGroupRow } from './row/holding-account-group-row';

@Component({
  selector: 'tbody[app-holding-account-group]',
  imports: [
    HoldingAccountGroupRow,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiCellSub,
    UiFlipItem,
    UiGroupCell,
    UiHighlight,
    UiRowLink,
    UiTd,
    UiTr,
  ],
  templateUrl: './holding-account-group.html',
  hostDirectives: [{ directive: UiGroup, inputs: ['collapsed'] }],
  host: {
    class: 'scroll-mt-4',
    'data-testid': 'account-group',
    '[attr.data-account-id]': 'group().accountId',
    '[id]': 'bodyId()',
  },
})
export class HoldingAccountGroup {
  readonly group = input.required<AccountGroup>();
  readonly selectedHoldingId = input<string | undefined>(undefined);
  readonly flash = input<HoldingChange | null>(null);
  readonly expanded = input(true, { transform: booleanAttribute });
  readonly toggleDisabled = input(false, { transform: booleanAttribute });

  readonly editCash = output<string>();
  readonly enterQuote = output<HoldingResponse>();
  readonly expandedChange = output<boolean>();

  protected readonly bodyId = computed(() => `holdings-group-${this.group().accountId}`);

  protected readonly cashRowKeys = cashRowKeys;
  protected readonly meta = injectGroupMeta(this.group);
}
