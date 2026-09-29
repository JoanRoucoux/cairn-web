import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { AccountService } from '@core/api-client/account/account.service';

@Injectable()
export class AccountDeleteStore {
  #accountsApiClient = inject(AccountService);

  readonly deleting = signal(false);
  readonly refused = signal(false);
  readonly error = signal(false);

  async remove(accountId: string): Promise<boolean> {
    this.deleting.set(true);
    this.refused.set(false);
    this.error.set(false);

    try {
      await firstValueFrom(this.#accountsApiClient.deleteAccount(accountId));

      return true;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 422) {
        this.refused.set(true);
      } else {
        this.error.set(true);
      }

      return false;
    } finally {
      this.deleting.set(false);
    }
  }
}
