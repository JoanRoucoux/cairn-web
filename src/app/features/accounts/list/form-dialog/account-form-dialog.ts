import { Component, ElementRef, afterRenderEffect, effect, inject, input, output, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiButton, UiDialog, UiField, UiInput, UiSelect } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { AccountType } from '@core/api-client/cairnAPI.schemas';

import { type AccountDraftSource } from './account-form';
import { AccountFormDialogStore } from './account-form-dialog-store';

export type AccountFormTarget = AccountDraftSource & { id: string };

@Component({
  selector: 'app-account-form-dialog',
  imports: [FormField, TranslocoPipe, UiButton, UiDialog, UiField, UiInput, UiSelect],
  templateUrl: './account-form-dialog.html',
  providers: [AccountFormDialogStore],
})
export class AccountFormDialog {
  #store = inject(AccountFormDialogStore);

  readonly account = input<AccountFormTarget | undefined>(undefined);
  readonly savedForm = output<void>();
  readonly dismissed = output<void>();

  protected readonly open = signal(true);
  protected readonly form = this.#store.form;
  protected readonly error = this.#store.error;
  protected readonly nameConflict = this.#store.nameConflict;
  protected readonly accountTypes = Object.values(AccountType);

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => this.#store.prefill(this.account()));

    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        this.#host.nativeElement.querySelector<HTMLButtonElement>('[data-testid="account-form-cancel"]')?.focus();
      }
    });
  }

  protected onNameInput(): void {
    this.#store.nameConflict.set(false);
  }

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.save(this.account()?.id)) {
      this.open.set(false);
      this.savedForm.emit();
    }
  }
}
