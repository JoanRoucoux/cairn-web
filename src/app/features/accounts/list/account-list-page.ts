import { Component, inject, signal } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';
import { UiButton, UiCard, UiField, UiInput } from 'cairn-ui';

import { AccountListStore } from './account-list-store';

@Component({
  selector: 'app-account-list-page',
  imports: [TranslocoPipe, UiButton, UiCard, UiField, UiInput],
  templateUrl: './account-list-page.html',
})
export class AccountListPage {
  #store = inject(AccountListStore);

  protected readonly accounts = this.#store.accounts;
  protected readonly error = this.#store.error;

  protected readonly draftName = signal('');
  protected readonly draftType = signal('');
  protected readonly draftInstitution = signal('');

  protected onNameInput(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  protected onTypeInput(event: Event): void {
    this.draftType.set((event.target as HTMLInputElement).value);
  }

  protected onInstitutionInput(event: Event): void {
    this.draftInstitution.set((event.target as HTMLInputElement).value);
  }

  protected async onCreate(): Promise<void> {
    if (await this.#store.create(this.draftName(), this.draftType(), this.draftInstitution())) {
      this.draftName.set('');
      this.draftType.set('');
      this.draftInstitution.set('');
    }
  }
}
