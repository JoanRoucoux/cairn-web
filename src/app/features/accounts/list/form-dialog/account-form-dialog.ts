import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiAlert, UiButton, UiChoiceChips, UiDialog, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AccountType } from '@core/api-client/cairnAPI.schemas';
import { LanguageStore } from '@core/i18n/language-store';

import { injectDialogOutcome } from '@shared/dialog/dialog-outcome';
import { focusInitial } from '@shared/dialog/focus-initial';
import { injectToast } from '@shared/feedback/toast';

import { type AccountDraftSource } from './account-form';
import { AccountFormDialogStore } from './account-form-dialog-store';

const ENVELOPES = [
  AccountType.PEA,
  AccountType.PEE,
  AccountType.PER,
  AccountType.CTO,
  AccountType.LIFE_INSURANCE,
  AccountType.CRYPTO,
  AccountType.SAVINGS,
];

export type AccountFormTarget = AccountDraftSource & { id: string };

@Component({
  selector: 'app-account-form-dialog',
  imports: [FormField, TranslocoPipe, UiAlert, UiButton, UiChoiceChips, UiDialog, UiField, UiInput],
  templateUrl: './account-form-dialog.html',
  providers: [AccountFormDialogStore],
})
export class AccountFormDialog {
  #store = inject(AccountFormDialogStore);

  readonly account = input<AccountFormTarget | undefined>(undefined);
  readonly savedForm = output<void>();
  readonly dismissed = output<void>();

  #toast = injectToast();
  readonly #outcome = injectDialogOutcome<void>(() =>
    this.#toast(this.account() ? 'accounts.toasts.updated' : 'accounts.toasts.created'),
  );

  protected readonly open = this.#outcome.open;
  protected readonly form = this.#store.form;
  protected readonly error = this.#store.error;
  protected readonly nameConflict = this.#store.nameConflict;
  protected readonly savingsConflict = this.#store.savingsConflict;
  readonly #transloco = inject(TranslocoService);
  readonly #language = inject(LanguageStore);

  protected readonly typeOptions = computed(() => {
    this.#language.activeLang();
    const types = [...ENVELOPES, ...(this.account()?.type === AccountType.PEA_PME ? [AccountType.PEA_PME] : [])];

    return types.map((type) => ({ value: type, label: this.#transloco.translate(`enums.accountType.${type}`) }));
  });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => this.#store.prefill(this.account()));

    effect(() => {
      this.form.type().value();
      untracked(() => this.#store.savingsConflict.set(false));
    });

    afterRenderEffect(() => {
      if (this.open() && this.#host.nativeElement.querySelector('dialog')?.open) {
        focusInitial(this.#host.nativeElement, 'account-form-cancel', 'account-form-name');
      }
    });
  }

  protected onNameInput(): void {
    this.#store.nameConflict.set(false);
  }

  protected dismiss(): void {
    this.#outcome.dismiss();
  }

  protected onClosed(): void {
    const result = this.#outcome.settle();

    if (result) {
      this.savedForm.emit();
    } else {
      this.dismissed.emit();
    }
  }

  protected async confirm(): Promise<void> {
    if (await this.#store.save(this.account()?.id)) {
      this.#outcome.succeed();
    }
  }
}
