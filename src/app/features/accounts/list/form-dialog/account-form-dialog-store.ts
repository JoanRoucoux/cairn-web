import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import { AccountService } from '@core/api-client/account/account.service';

import { formMessages } from '@shared/forms/form-messages';

import { type AccountDraftSource, accountDraftSchema, initialAccountDraft } from './account-form';

@Injectable()
export class AccountFormDialogStore {
  #accountsApiClient = inject(AccountService);

  readonly #model = signal(initialAccountDraft());

  readonly #messages = formMessages();

  readonly form = form(this.#model, accountDraftSchema(this.#messages));

  readonly error = signal(false);
  readonly nameConflict = signal(false);

  prefill(account: AccountDraftSource | undefined): void {
    this.#model.set(initialAccountDraft(account));
  }

  async save(accountId?: string): Promise<boolean> {
    this.error.set(false);
    this.nameConflict.set(false);
    let saved = false;

    await submit(this.form, async () => {
      try {
        const model = this.#model();
        const payload = { name: model.name, type: model.type, institution: model.institution.trim() };
        await firstValueFrom(
          accountId
            ? this.#accountsApiClient.updateAccount(accountId, payload)
            : this.#accountsApiClient.createAccount(payload),
        );
        saved = true;
      } catch (err) {
        if (err instanceof HttpErrorResponse && err.status === 409) {
          this.nameConflict.set(true);
        } else {
          this.error.set(true);
        }
      }
    });

    return saved;
  }
}
