import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiButton, UiCard, UiMenu, UiMenuItem, UiMenuTrigger, UiRow, UiRowItem } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis, LucidePencil, LucideTrash, LucideWallet } from '@lucide/angular';

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
    LucideWallet,
    RouterLink,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiButton,
    UiCard,
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
  readonly edit = output<AccountView>();
  readonly editBalance = output<AccountView>();
  readonly remove = output<AccountView>();

  protected readonly linesLabel = linesLabel;
  protected readonly uncountedCaptions = uncountedCaptions;
}
