import { Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiButton, UiCard, UiField, UiInput } from 'cairn-ui';

import { AccountListStore } from './account-list-store';

@Component({
  selector: 'app-account-list-page',
  imports: [FormField, TranslocoPipe, UiButton, UiCard, UiField, UiInput],
  templateUrl: './account-list-page.html',
})
export class AccountListPage {
  #store = inject(AccountListStore);

  protected readonly accounts = this.#store.accounts;
  protected readonly error = this.#store.error;
  protected readonly form = this.#store.form;

  protected async onCreate(): Promise<void> {
    if (await this.#store.create()) {
      this.#store.reset();
    }
  }
}
