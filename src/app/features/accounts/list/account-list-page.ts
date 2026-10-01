import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  UiAmount,
  UiAsync,
  UiBadge,
  UiButton,
  UiMenu,
  UiMenuItem,
  UiMenuTrigger,
  UiRowAction,
  UiRowLink,
  UiSkeleton,
  UiTable,
  UiTd,
  UiTh,
  UiTr,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis, LucidePencil, LucidePlus, LucideTrash2 } from '@lucide/angular';

import { pluralKey } from '@shared/format/plural-key';
import { RatioPipe } from '@shared/format/ratio-pipe';

import { AccountListStore, type AccountView } from './account-list-store';
import { AccountDeleteDialog } from './delete-dialog/account-delete-dialog';
import { AccountFormDialog, type AccountFormTarget } from './form-dialog/account-form-dialog';

@Component({
  selector: 'app-account-list-page',
  imports: [
    AccountDeleteDialog,
    AccountFormDialog,
    LucideEllipsis,
    LucidePencil,
    LucidePlus,
    LucideTrash2,
    RatioPipe,
    RouterLink,
    TranslocoPipe,
    UiAmount,
    UiAsync,
    UiBadge,
    UiButton,
    UiMenu,
    UiMenuItem,
    UiMenuTrigger,
    UiRowAction,
    UiRowLink,
    UiSkeleton,
    UiTable,
    UiTd,
    UiTh,
    UiTr,
  ],
  templateUrl: './account-list-page.html',
  providers: [AccountListStore],
})
export class AccountListPage {
  #store = inject(AccountListStore);

  protected readonly accounts = this.#store.accounts;
  protected readonly totalEur = this.#store.totalEur;
  protected readonly pluralKey = pluralKey;
  protected readonly state = this.#store.state;
  protected readonly cardPadding = computed(
    () =>
      ({ ready: 'p-[6px_4px_6px_8px]', loading: 'px-4 py-2', error: 'px-4 py-5', empty: 'p-4' })[this.#store.state()],
  );
  protected readonly skeletonWidths = [120, 90, 100, 80, 110, 96];

  protected readonly formOpen = signal(false);
  protected readonly accountToEdit = signal<AccountFormTarget | undefined>(undefined);
  protected readonly accountToDelete = signal<AccountView | undefined>(undefined);

  protected linesLabel(account: AccountView): string {
    if (account.lineCount === 0) {
      return 'accounts.noLine';
    }

    return pluralKey(account.type === 'SAVINGS' ? 'accounts.bookletCount' : 'accounts.lineCount', account.lineCount);
  }

  protected onAdd(): void {
    this.accountToEdit.set(undefined);
    this.formOpen.set(true);
  }

  protected onEdit(account: AccountView): void {
    this.accountToEdit.set(account);
    this.formOpen.set(true);
  }

  protected onFormSaved(): void {
    this.formOpen.set(false);
    this.#store.retry();
  }

  protected onFormDismissed(): void {
    this.formOpen.set(false);
  }

  protected onDeleted(): void {
    this.accountToDelete.set(undefined);
    this.#store.retry();
  }

  protected retry(): void {
    this.#store.retry();
  }
}
