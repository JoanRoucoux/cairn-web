import type { ModuleWithProviders, Provider } from '@angular/core';

import { TRANSLOCO_LOADER, TranslocoTestingModule, type TranslocoTestingOptions } from '@jsverse/transloco';
import { map, timer } from 'rxjs';

/**
 * Provides Transloco in unit tests. Translation pipes and directives resolve
 * to the translation key itself unless translations are provided via `langs`.
 * Feature scopes are registered empty so specs can mirror the route-level
 * `provideTranslocoScope(...)` wiring without loading real translation files.
 */
export const getTranslocoTestingModule = (
  options: TranslocoTestingOptions = {},
): ModuleWithProviders<TranslocoTestingModule> => {
  return TranslocoTestingModule.forRoot({
    langs: {
      en: {},
      fr: {},
      'portfolio/en': {},
      'portfolio/fr': {},
      'holdings/en': {},
      'holdings/fr': {},
      'instruments/en': {},
      'instruments/fr': {},
      'accounts/en': {},
      'accounts/fr': {},
      'profile/en': {},
      'profile/fr': {},
    },
    translocoConfig: {
      availableLangs: ['en', 'fr'],
      defaultLang: 'en',
    },
    preloadLangs: true,
    ...options,
  });
};

export const delayedScopeLoader = (delayMs = 300): Provider => ({
  provide: TRANSLOCO_LOADER,
  useValue: {
    getTranslation: (lang: string) => timer(lang.includes('/') ? delayMs : 0).pipe(map(() => ({}))),
  },
});
