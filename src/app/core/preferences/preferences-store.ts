import { Injectable, effect, inject, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { firstValueFrom } from 'rxjs';

import type {
  UpdatePreferencesRequest,
  UpdatePreferencesRequestLanguage,
  UpdatePreferencesRequestTheme,
} from '@core/api-client/cairnAPI.schemas';
import { PreferencesService as PreferencesApiClient } from '@core/api-client/preferences/preferences.service';
import { LanguageStore } from '@core/i18n/language-store';
import { type ThemePreference, ThemeStore } from '@core/theme/theme-store';

@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  #apiClient = inject(PreferencesApiClient);
  #theme = inject(ThemeStore);
  #language = inject(LanguageStore);

  #themeTouched = false;
  #languageTouched = false;

  readonly #preferences = rxResource({
    stream: () => this.#apiClient.getPreferences(),
  });

  constructor() {
    effect(() => {
      if (!this.#preferences.hasValue()) {
        return;
      }

      const { language, theme } = this.#preferences.value();

      untracked(() => {
        if (!this.#languageTouched) {
          this.#language.setActiveLang(language);
        }

        if (!this.#themeTouched) {
          this.#theme.set(theme);
        }
      });
    });
  }

  async setTheme(theme: ThemePreference): Promise<boolean> {
    this.#themeTouched = true;
    const previous = this.#theme.preference();
    this.#theme.set(theme);

    return this.#save({ theme: theme as UpdatePreferencesRequestTheme }, () => {
      this.#themeTouched = false;
      this.#theme.set(previous);
    });
  }

  async setLanguage(lang: string): Promise<boolean> {
    this.#languageTouched = true;
    const previous = this.#language.activeLang();
    this.#language.setActiveLang(lang);

    return this.#save({ language: lang as UpdatePreferencesRequestLanguage }, () => {
      this.#languageTouched = false;
      this.#language.setActiveLang(previous);
    });
  }

  async #save(body: UpdatePreferencesRequest, restore: () => void): Promise<boolean> {
    try {
      await firstValueFrom(this.#apiClient.updatePreferences(body));

      return true;
    } catch {
      restore();

      return false;
    }
  }
}
