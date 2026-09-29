import { Injectable, inject, signal } from '@angular/core';

import { AmountVisibility } from '@core/amounts/amount-visibility';
import { LanguageStore } from '@core/i18n/language-store';
import { SessionStore } from '@core/session/session-store';
import { type ThemePreference, ThemeStore } from '@core/theme/theme-store';

@Injectable()
export class ProfileStore {
  #session = inject(SessionStore);
  #theme = inject(ThemeStore);
  #language = inject(LanguageStore);
  #amountVisibility = inject(AmountVisibility);

  readonly owner = this.#session.owner;
  readonly passkeys = this.#session.passkeys;
  readonly theme = this.#theme.preference;
  readonly language = this.#language.activeLang;
  readonly availableLanguages = this.#language.availableLangs;
  readonly hideAmounts = this.#amountVisibility.hidden;

  readonly revocationRefused = signal(false);

  setTheme(preference: ThemePreference): void {
    this.#theme.set(preference);
  }

  setLanguage(lang: string): void {
    this.#language.setActiveLang(lang);
  }

  setHideAmounts(value: boolean): void {
    this.#amountVisibility.setHidden(value);
  }

  async revokePasskey(credentialId: string): Promise<void> {
    this.revocationRefused.set(false);
    this.revocationRefused.set(!(await this.#session.revokePasskey(credentialId)));
  }

  async signOut(): Promise<void> {
    await this.#session.signOut();
  }

  reloadSession(): void {
    this.#session.reload();
  }
}
