import { Injectable, inject } from '@angular/core';

import { PageLoad } from '@core/navigation/page-load';

const SIGN_IN_URL = '/login';

@Injectable({ providedIn: 'root' })
export class SignInRedirect {
  #pageLoad = inject(PageLoad);
  #started = false;

  start(): void {
    if (this.#started) {
      return;
    }

    this.#started = true;
    this.#pageLoad.to(SIGN_IN_URL);
  }
}
