import { DOCUMENT, Injectable, inject } from '@angular/core';

/** The only call to location.assign in the application. */
@Injectable({ providedIn: 'root' })
export class PageLoad {
  #document = inject(DOCUMENT);

  to(path: string): void {
    this.#document.defaultView?.location.assign(path);
  }
}
