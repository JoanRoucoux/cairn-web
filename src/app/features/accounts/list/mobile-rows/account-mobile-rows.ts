import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiMenu, UiMenuItem, UiMenuTrigger } from '@joanroucoux/cairn-ui/menu';
import { UiHighlight } from '@joanroucoux/cairn-ui/motion';
import { UiRow, UiRowItem } from '@joanroucoux/cairn-ui/row';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis, LucidePencil, LucideTrash } from '@lucide/angular';

import { ShortDatePipe } from '@shared/format/short-date-pipe';

import type { AccountView } from '../account-list-store';
import { linesLabel } from '../lines-label';
import { uncountedCaptions } from '../uncounted-captions';

@Component({
  selector: 'app-account-mobile-rows',
  imports: [
    LucideEllipsis,
    LucidePencil,
    LucideTrash,
    RouterLink,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiButton,
    UiCard,
    UiHighlight,
    UiMenu,
    UiMenuItem,
    UiMenuTrigger,
    UiRow,
    UiRowItem,
  ],
  templateUrl: './account-mobile-rows.html',
})
export class AccountMobileRows {
  readonly accounts = input.required<AccountView[]>();
  readonly added = input<string | null>(null);
  readonly edit = output<AccountView>();
  readonly remove = output<AccountView>();

  protected readonly linesLabel = linesLabel;
  protected readonly uncountedCaptions = uncountedCaptions;
}
