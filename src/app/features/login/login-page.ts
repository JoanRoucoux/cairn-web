import { Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiButton, UiCard, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { PageLoad } from '@core/navigation/page-load';

import { LoginStore } from './login-store';

@Component({
  selector: 'app-login-page',
  imports: [FormField, TranslocoPipe, UiButton, UiCard, UiField, UiInput],
  templateUrl: './login-page.html',
  providers: [LoginStore],
})
export class LoginPage {
  #store = inject(LoginStore);
  #pageLoad = inject(PageLoad);

  protected readonly form = this.#store.form;
  protected readonly refused = this.#store.refused;
  protected readonly failed = this.#store.failed;

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (!(await this.#store.signIn())) {
      return;
    }

    // A full page load, not a router navigation: the shell and the session store have to start
    // against the session that now exists.
    this.#pageLoad.to('/');
  }
}
