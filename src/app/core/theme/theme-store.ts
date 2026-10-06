import { DOCUMENT, Injectable, type Signal, inject, signal } from '@angular/core';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type ThemeScheme = 'light' | 'dark';

const STORAGE_KEY = 'cairn.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const isPreference = (value: string | null): value is ThemePreference =>
  value !== null && (THEME_PREFERENCES as readonly string[]).includes(value);

type ThemeColor = { meta: HTMLMetaElement; scheme: ThemeScheme; content: string };

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  #document = inject(DOCUMENT);
  readonly #themeColors: ThemeColor[] = Array.from(
    this.#document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    (meta) => ({ meta, scheme: meta.matches('[media*="dark"]') ? 'dark' : 'light', content: meta.content }),
  );
  readonly #preference = signal<ThemePreference>(this.#read());

  readonly #systemScheme = signal<ThemeScheme>('light');

  readonly preference: Signal<ThemePreference> = this.#preference.asReadonly();
  readonly systemScheme: Signal<ThemeScheme> = this.#systemScheme.asReadonly();

  constructor() {
    this.#apply(this.#preference());
    this.#followDevice();
  }

  set(preference: ThemePreference): void {
    this.#preference.set(preference);
    localStorage.setItem(STORAGE_KEY, preference);

    const root = this.#document.documentElement;
    root.setAttribute('data-theme-switching', '');
    this.#apply(preference);
    root.getBoundingClientRect();
    requestAnimationFrame(() => root.removeAttribute('data-theme-switching'));
  }

  #followDevice(): void {
    const query = this.#document.defaultView?.matchMedia?.(DARK_QUERY);

    if (!query) {
      return;
    }

    const update = (dark: boolean): void => this.#systemScheme.set(dark ? 'dark' : 'light');
    update(query.matches);
    query.addEventListener('change', (event) => update(event.matches));
  }

  #read(): ThemePreference {
    const stored = localStorage.getItem(STORAGE_KEY);

    return isPreference(stored) ? stored : 'system';
  }

  #apply(preference: ThemePreference): void {
    const root = this.#document.documentElement;
    const forced = this.#themeColors.find((color) => color.scheme === preference)?.content;

    for (const color of this.#themeColors) {
      color.meta.content = forced ?? color.content;
    }

    if (preference === 'system') {
      root.removeAttribute('data-theme');
      return;
    }

    root.setAttribute('data-theme', preference);
  }
}
