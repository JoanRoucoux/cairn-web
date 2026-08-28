import { Component, DOCUMENT, inject, signal } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-offline-banner',
  imports: [TranslocoPipe],
  template: `
    @if (offline()) {
      <p
        class="bg-(--stale)/12 px-4 py-2 text-center text-[12.5px] text-(--stale)"
        data-testid="offline-banner"
        role="status"
      >
        {{ 'shell.offline' | transloco }}
      </p>
    }
  `,
})
export class OfflineBanner {
  #window = inject(DOCUMENT).defaultView;

  protected readonly offline = signal(this.#window ? !this.#window.navigator.onLine : false);

  constructor() {
    this.#window?.addEventListener('online', () => this.offline.set(false));
    this.#window?.addEventListener('offline', () => this.offline.set(true));
  }
}
