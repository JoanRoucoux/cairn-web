import {
  type EnvironmentProviders,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';

import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { cookiesStorage, provideTranslocoPersistLang } from '@jsverse/transloco-persist-lang';
import { firstValueFrom } from 'rxjs';

import { TranslocoHttpLoader } from '@core/i18n/transloco-loader';

export const AVAILABLE_LANGS = ['fr', 'en'] as const;

export const provideTranslocoGlobal = (): EnvironmentProviders => {
  return makeEnvironmentProviders([
    provideTransloco({
      config: {
        availableLangs: [...AVAILABLE_LANGS],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoPersistLang({
      storage: {
        useValue: cookiesStorage(),
      },
    }),
    // Without waiting for the active language, the first paint shows missing-translation warnings.
    provideAppInitializer(() => {
      const translocoService = inject(TranslocoService);
      return firstValueFrom(translocoService.load(translocoService.getActiveLang()));
    }),
  ]);
};
