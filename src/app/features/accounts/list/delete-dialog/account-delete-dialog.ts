import { Component, inject, input, output, signal } from '@angular/core';

import { UiAlert, UiButton, UiDialog } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

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

  protected readonly open = signal(true);
  protected readonly deleting = this.#store.deleting;
  protected readonly refused = this.#store.refused;
  protected readonly error = this.#store.error;

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.remove(this.account().id)) {
      this.open.set(false);
      this.deleted.emit();
    }
  }
}
