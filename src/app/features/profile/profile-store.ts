import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { firstValueFrom } from 'rxjs';

import { AmountVisibility } from '@core/amounts/amount-visibility';
import { SessionService } from '@core/api-client/session/session.service';
import { LanguageStore } from '@core/i18n/language-store';
import { SessionStore } from '@core/session/session-store';
import { type ThemePreference, ThemeStore } from '@core/theme/theme-store';

@Injectable()
export class ProfileStore {
  #session = inject(SessionStore);
  #sessionApiClient = inject(SessionService);
  #theme = inject(ThemeStore);
  #language = inject(LanguageStore);
  #amountVisibility = inject(AmountVisibility);

  readonly #passkeys = rxResource({
    stream: () => this.#sessionApiClient.listPasskeys(),
  });

  readonly owner = this.#session.owner;
  readonly passkeys = computed(() => this.#passkeys.value() ?? []);
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

  // The server refuses to revoke the last passkey, which would lock the owner out for good.
  async revokePasskey(credentialId: string): Promise<void> {
    this.revocationRefused.set(false);
    try {
      await firstValueFrom(this.#sessionApiClient.revokePasskey(credentialId));
      this.#passkeys.reload();
    } catch {
      this.revocationRefused.set(true);
    }
  }

  async signOut(): Promise<void> {
    await this.#session.signOut();
  }

  reloadPasskeys(): void {
    this.#passkeys.reload();
  }
}
