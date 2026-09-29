import { DOCUMENT, Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PageLoad {
  #document = inject(DOCUMENT);

  to(path: string): void {
    this.#document.defaultView?.location.replace(path);
  }
}
