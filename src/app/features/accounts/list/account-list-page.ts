import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  UiAmount,
  UiAsync,
  UiBadge,
  UiButton,
  UiCard,
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
import { LucideEllipsis, LucidePencil, LucidePlus, LucideTrash, LucideWallet } from '@lucide/angular';

import { excludedTotal } from '@shared/format/excluded-lines';
import { RatioPipe } from '@shared/format/ratio-pipe';
import { ShortDatePipe } from '@shared/format/short-date-pipe';

import { AccountListStore, type AccountView } from './account-list-store';
import { AccountDeleteDialog } from './delete-dialog/account-delete-dialog';
import { AccountFormDialog, type AccountFormTarget } from './form-dialog/account-form-dialog';
import { linesLabel } from './lines-label';
import { AccountMobileRows } from './mobile-rows/account-mobile-rows';
import { AccountSummary } from './summary/account-summary';
import { AccountUncounted } from './uncounted/account-uncounted';

@Component({
  selector: 'app-account-list-page',
  imports: [
    AccountDeleteDialog,
    AccountUncounted,
    AccountMobileRows,
    AccountSummary,
    AccountFormDialog,
    LucideEllipsis,
    LucidePencil,
    LucidePlus,
    LucideTrash,
    LucideWallet,
    RatioPipe,
    RouterLink,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiAsync,
    UiBadge,
    UiCard,
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
  #router = inject(Router);

  protected readonly accounts = this.#store.accounts;
  protected readonly totalEur = this.#store.totalEur;
  protected readonly excludedTotal = computed(() => excludedTotal(this.#store.excluded()));
  protected readonly linesLabel = linesLabel;
  protected readonly state = this.#store.state;
  protected readonly cardPadding = computed(
    () => ({ ready: 'p-[6px_4px_6px_8px]', loading: 'px-4 py-2', error: '', empty: '' })[this.state()],
  );
  protected readonly skeletonWidths = [120, 90, 100, 80, 110, 96];

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

  protected onEditBalance(account: AccountView): void {
    void this.#router.navigate(['/holdings'], { queryParams: { balance: account.id } });
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
