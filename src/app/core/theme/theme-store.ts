import { DOCUMENT, Injectable, type Signal, inject, signal } from '@angular/core';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

const STORAGE_KEY = 'cairn.theme';

const isPreference = (value: string | null): value is ThemePreference =>
  value !== null && (THEME_PREFERENCES as readonly string[]).includes(value);

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  #document = inject(DOCUMENT);
  readonly #preference = signal<ThemePreference>(this.#read());

  readonly preference: Signal<ThemePreference> = this.#preference.asReadonly();

  constructor() {
    this.#apply(this.#preference());
  }

  set(preference: ThemePreference): void {
    this.#preference.set(preference);
    localStorage.setItem(STORAGE_KEY, preference);
    this.#apply(preference);
  }

  #read(): ThemePreference {
    const stored = localStorage.getItem(STORAGE_KEY);

    return isPreference(stored) ? stored : 'system';
  }

  #apply(preference: ThemePreference): void {
    const root = this.#document.documentElement;

    // 'system' must leave the attribute off entirely: the token sheet resolves through
    // light-dark(), which follows the OS only while nothing is stamped.
    if (preference === 'system') {
      root.removeAttribute('data-theme');
      return;
    }

    root.setAttribute('data-theme', preference);
  }
}
