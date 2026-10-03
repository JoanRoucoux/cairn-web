import { type EnvironmentProviders, inject, provideEnvironmentInitializer } from '@angular/core';

import { ThemeStore } from './theme-store';

export function provideThemeInit(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    inject(ThemeStore);
  });
}
