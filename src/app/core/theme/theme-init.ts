import { type EnvironmentProviders, inject, provideEnvironmentInitializer } from '@angular/core';

import { ThemeStore } from './theme-store';

/**
 * `ThemeStore` is `providedIn: 'root'`, so nothing constructs it - and stamps `data-theme` from
 * the stored preference - until something injects it. Only `profile-store.ts` does today, which
 * left every other screen ignoring a stored `light`/`dark` preference until the account screen had
 * been visited once in the session.
 */
export function provideThemeInit(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    inject(ThemeStore);
  });
}
