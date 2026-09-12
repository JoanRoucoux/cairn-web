import { Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiButton, UiCard, UiField, UiInput, UiSelect } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { CreateAccountRequestType } from '@core/api-client/cairnAPI.schemas';

import { AccountListStore } from './account-list-store';

@Component({
  selector: 'app-account-list-page',
  imports: [FormField, TranslocoPipe, UiButton, UiCard, UiField, UiInput, UiSelect],
  templateUrl: './account-list-page.html',
  providers: [AccountListStore],
})
export class AccountListPage {
  #store = inject(AccountListStore);

  protected readonly accounts = this.#store.accounts;
  protected readonly error = this.#store.error;
  protected readonly form = this.#store.form;
  protected readonly accountTypes = Object.values(CreateAccountRequestType);

  protected async onCreate(): Promise<void> {
    if (await this.#store.create()) {
      this.#store.reset();
    }
  }
}
