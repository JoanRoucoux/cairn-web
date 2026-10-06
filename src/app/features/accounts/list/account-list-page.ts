import { Component, ElementRef, afterRenderEffect, computed, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAmount } from '@joanroucoux/cairn-ui/amount';
import { UiAsync, delayedState } from '@joanroucoux/cairn-ui/async';
import { UiBadge } from '@joanroucoux/cairn-ui/badge';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiMenu, UiMenuItem, UiMenuTrigger } from '@joanroucoux/cairn-ui/menu';
import { UiHighlight } from '@joanroucoux/cairn-ui/motion';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { UiRowAction, UiRowLink, UiTable, UiTd, UiTh, UiTr } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsis, LucidePencil, LucidePlus, LucideTrash } from '@lucide/angular';

import { afterHighlight } from '@shared/feedback/after-highlight';
import { injectToast } from '@shared/feedback/toast';
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
    RatioPipe,
    RouterLink,
    ShortDatePipe,
    TranslocoPipe,
    UiAmount,
    UiAsync,
    UiBadge,
    UiCard,
    UiButton,
    UiHighlight,
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
  protected readonly excludedTotal = computed(() => excludedTotal(this.#store.excluded()));
  protected readonly linesLabel = linesLabel;
  protected readonly state = this.#store.state;
  protected readonly shown = delayedState(this.state);
  protected readonly cardPadding = computed(
    () => ({ ready: 'p-[6px_4px_6px_8px]', loading: 'px-4 py-2', error: '', empty: '' })[this.shown() ?? 'empty'],
  );
  protected readonly skeletonWidths = [120, 90, 100, 80, 110, 96];

  protected readonly formOpen = signal(false);
  protected readonly accountToEdit = signal<AccountFormTarget | undefined>(undefined);
  protected readonly accountToDelete = signal<AccountView | undefined>(undefined);
  protected readonly addedAccountId = signal<string | null>(null);
  readonly #unannounced = signal<string | null>(null);
  #toast = injectToast();
  #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      const added = this.#unannounced();

      if (added !== null && (this.state() === 'error' || this.accounts().some((account) => account.id === added))) {
        untracked(() => {
          this.#unannounced.set(null);

          if (this.state() === 'error') {
            this.#toast('accounts.toasts.created');
          } else {
            afterHighlight(
              () => [...this.#host.nativeElement.querySelectorAll(`[data-account-id="${added}"]`)],
              () => this.#toast('accounts.toasts.created'),
            );
          }
        });
      }
    });
  }

  protected onAdd(): void {
    this.accountToEdit.set(undefined);
    this.formOpen.set(true);
  }

  protected onEdit(account: AccountView): void {
    this.accountToEdit.set(account);
    this.formOpen.set(true);
  }

  protected onFormSaved(accountId: string): void {
    if (!this.accountToEdit()) {
      this.addedAccountId.set(accountId);
      this.#unannounced.set(accountId);
    }
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
