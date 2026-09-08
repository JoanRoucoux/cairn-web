import { Injectable, inject } from '@angular/core';

import { PageLoad } from '@core/navigation/page-load';

const SIGN_IN_URL = '/login';

/**
 * Sends the browser to the application's sign-in screen, and does it once. A page load fires
 * several requests at once, so without this every one of their 401s starts its own navigation,
 * which the browser shows as a flicker or a bounce.
 */
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
