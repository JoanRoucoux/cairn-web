import { DOCUMENT, Injectable, inject } from '@angular/core';

const SIGN_IN_URL = '/login';

/**
 * Sends the browser to Spring Security's sign-in page, and does it once. A page load fires several
 * requests at once, so without this every one of their 401s starts its own navigation, which the
 * browser shows as a flicker or a bounce.
 */
@Injectable({ providedIn: 'root' })
export class SignInRedirect {
  #document = inject(DOCUMENT);
  #started = false;

  start(): void {
    if (this.#started) {
      return;
    }

    this.#started = true;
    this.#document.defaultView?.location.assign(SIGN_IN_URL);
  }
}
