import { Component, inject, input, output } from '@angular/core';

import { UiAlert, UiButton, UiDialog } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { injectToast } from '@shared/feedback/toast';
import { pluralKey } from '@shared/format/plural-key';

import type { AccountView } from '../account-list-store';
import { AccountDeleteStore } from './account-delete-store';

@Component({
  selector: 'app-account-delete-dialog',
  imports: [TranslocoPipe, UiAlert, UiButton, UiDialog],
  templateUrl: './account-delete-dialog.html',
  providers: [AccountDeleteStore],
})
export class AccountDeleteDialog {
  protected readonly pluralKey = pluralKey;
  #store = inject(AccountDeleteStore);

  readonly account = input.required<AccountView>();
  readonly deleted = output<void>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  readonly #outcome = injectDialogOutcome<void>(() => this.#toast('accounts.toasts.deleted'));

  protected readonly open = this.#outcome.open;
  protected readonly deleting = this.#store.deleting;
  protected readonly refused = this.#store.refused;
  protected readonly error = this.#store.error;

  protected dismiss(): void {
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.deleted.emit();
    } else {
      this.dismissed.emit();
    }
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.remove(this.account().id)) {
      this.#outcome.succeed();
    }
  }
}
