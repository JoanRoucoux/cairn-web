import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiButton, UiCard, UiMenu, UiMenuItem, UiMenuTrigger, UiRow, UiRowItem } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis, LucidePencil, LucideTrash } from '@lucide/angular';

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
  readonly remove = output<AccountView>();

  protected readonly linesLabel = linesLabel;
  protected readonly uncountedCaptions = uncountedCaptions;
}
