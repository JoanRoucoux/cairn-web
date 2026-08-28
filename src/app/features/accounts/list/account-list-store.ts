import { Injectable, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { firstValueFrom } from 'rxjs';

import { AccountService } from '@core/api-client/account/account.service';
import type { CreateAccountRequestType } from '@core/api-client/cairnAPI.schemas';

@Injectable()
export class AccountListStore {
  #accountsApiClient = inject(AccountService);

  readonly error = signal(false);

  readonly accounts = rxResource({
    stream: () => this.#accountsApiClient.listAccounts(),
    defaultValue: [],
  });

  // The type and the institution are free text here: the field lets an operator type a value
  // the server enum does not (yet) know, and the server is the one source of truth for validity.
  async create(name: string, type: string, institution: string): Promise<boolean> {
    this.error.set(false);

    try {
      await firstValueFrom(
        this.#accountsApiClient.createAccount({ name, type: type as CreateAccountRequestType, institution }),
      );
      this.accounts.reload();

      return true;
    } catch {
      this.error.set(true);

      return false;
    }
  }
}
