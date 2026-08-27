import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { type ApplicationConfig, LOCALE_ID, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';

import { TranslocoService } from '@jsverse/transloco';

import { AppTitleStrategy } from '@core/i18n/title-strategy';
import { provideTranslocoGlobal } from '@core/i18n/transloco-provider';
import { errorHandlerInterceptor } from '@core/interceptors/error-handler-interceptor';

import { routes } from './app-routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorHandlerInterceptor])),
    provideTranslocoGlobal(),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    {
      provide: LOCALE_ID,
      useFactory: () => (inject(TranslocoService).getActiveLang() === 'fr' ? 'fr-FR' : 'en-GB'),
    },
  ],
};
