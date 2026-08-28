import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import {
  type ApplicationConfig,
  LOCALE_ID,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { TranslocoService } from '@jsverse/transloco';

import { AppTitleStrategy } from '@core/i18n/title-strategy';
import { provideTranslocoGlobal } from '@core/i18n/transloco-provider';
import { authRedirectInterceptor } from '@core/interceptors/auth-redirect-interceptor';
import { errorHandlerInterceptor } from '@core/interceptors/error-handler-interceptor';

import { routes } from './app-routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-CSRF-TOKEN' }),
      withInterceptors([authRedirectInterceptor, errorHandlerInterceptor]),
    ),
    provideTranslocoGlobal(),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    {
      provide: LOCALE_ID,
      useFactory: () => (inject(TranslocoService).getActiveLang() === 'fr' ? 'fr-FR' : 'en-GB'),
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
