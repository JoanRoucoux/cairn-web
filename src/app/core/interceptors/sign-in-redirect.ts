import { Injectable, inject } from '@angular/core';

import { PageLoad } from '@core/navigation/page-load';

import { LOGIN_PATHS } from '@features/login/contract/login-paths';

@Injectable({ providedIn: 'root' })
export class SignInRedirect {
  #pageLoad = inject(PageLoad);
  #started = false;

  start(): void {
    if (this.#started) {
      return;
    }

    this.#started = true;
    this.#pageLoad.to(LOGIN_PATHS.signIn);
  }
}
