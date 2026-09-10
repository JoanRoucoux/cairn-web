import { DOCUMENT } from '@angular/common';
import { Injectable, type Signal, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslocoService } from '@jsverse/transloco';

import { AVAILABLE_LANGS } from '@core/i18n/transloco-provider';

@Injectable({
  providedIn: 'root',
})
export class LanguageStore {
  #translocoService = inject(TranslocoService);
  #document = inject(DOCUMENT);

  readonly activeLang: Signal<string> = toSignal(this.#translocoService.langChanges$, {
    initialValue: this.#translocoService.getActiveLang(),
  });

  readonly availableLangs: readonly string[] = AVAILABLE_LANGS;

  constructor() {
    // Keep the `lang` attribute on <html> in sync so assistive technologies announce the right language.
    effect(() => {
      this.#document.documentElement.lang = this.activeLang();
    });
  }

  setActiveLang(lang: string): void {
    this.#translocoService.setActiveLang(lang);
  }
}
