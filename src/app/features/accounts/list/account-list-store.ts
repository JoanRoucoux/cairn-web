import { Injectable, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, submit } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import { AccountService } from '@core/api-client/account/account.service';
import type { CreateAccountRequestType } from '@core/api-client/cairnAPI.schemas';

import { accountDraftSchema, initialAccountDraft } from './account-form';

@Injectable()
export class AccountListStore {
  #accountsApiClient = inject(AccountService);

  readonly #model = signal(initialAccountDraft());

  readonly form = form(this.#model, accountDraftSchema);

  readonly error = signal(false);

  readonly accounts = rxResource({
    stream: () => this.#accountsApiClient.listAccounts(),
    defaultValue: [],
  });

  async create(): Promise<boolean> {
    this.error.set(false);
    let created = false;

    await submit(this.form, async () => {
      try {
        const model = this.#model();
        // The cast drops the empty placeholder option: required(account.type) is what guarantees
        // submit() never reaches this line with one.
        await firstValueFrom(
          this.#accountsApiClient.createAccount({
            name: model.name,
            type: model.type as CreateAccountRequestType,
            institution: model.institution,
          }),
        );
        this.accounts.reload();
        created = true;
      } catch {
        this.error.set(true);
      }
    });

    return created;
  }

  reset(): void {
    this.#model.set(initialAccountDraft());
  }
}
