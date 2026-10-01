import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount, UiButton, UiMenu, UiMenuItem, UiMenuTrigger, UiRow, UiRowItem } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis, LucidePencil, LucideTrash2 } from '@lucide/angular';

import type { AccountView } from '../account-list-store';
import { linesLabel } from '../lines-label';

@Component({
  selector: 'app-account-mobile-rows',
  imports: [
    LucideEllipsis,
    LucidePencil,
    LucideTrash2,
    RouterLink,
    TranslocoPipe,
    UiAmount,
    UiButton,
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
}
