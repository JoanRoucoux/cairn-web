import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  UiAmount,
  UiAsync,
  UiButton,
  UiMenu,
  UiMenuItem,
  UiMenuTrigger,
  UiRow,
  UiSkeleton,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis, LucidePlus } from '@lucide/angular';

import { pluralKey } from '@shared/format/plural-key';

import { AccountListStore, type AccountView } from './account-list-store';
import { AccountDeleteDialog } from './delete-dialog/account-delete-dialog';
import { AccountFormDialog, type AccountFormTarget } from './form-dialog/account-form-dialog';

@Component({
  selector: 'app-account-list-page',
  imports: [
    AccountDeleteDialog,
    AccountFormDialog,
    LucideEllipsis,
    LucidePlus,
    RouterLink,
    TranslocoPipe,
    UiAmount,
    UiAsync,
    UiButton,
    UiMenu,
    UiMenuItem,
    UiMenuTrigger,
    UiRow,
    UiSkeleton,
  ],
  templateUrl: './account-list-page.html',
  providers: [AccountListStore],
})
export class AccountListPage {
  #store = inject(AccountListStore);

  protected readonly accounts = this.#store.accounts;
  protected readonly pluralKey = pluralKey;
  protected readonly state = this.#store.state;

  protected readonly formOpen = signal(false);
  protected readonly accountToEdit = signal<AccountFormTarget | undefined>(undefined);
  protected readonly accountToDelete = signal<AccountView | undefined>(undefined);

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
