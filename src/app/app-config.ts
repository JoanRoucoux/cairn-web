import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { type ApplicationConfig, LOCALE_ID, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';

import { TranslocoService } from '@jsverse/transloco';

import { AppTitleStrategy } from '@core/i18n/title-strategy';
import { provideTranslocoGlobal } from '@core/i18n/transloco-provider';
import { authRedirectInterceptor } from '@core/interceptors/auth-redirect-interceptor';
import { errorHandlerInterceptor } from '@core/interceptors/error-handler-interceptor';
import { provideServiceWorkerRemoval } from '@core/pwa/service-worker-removal';

import { routes } from './app-routes';

// Both halves of a contract with Spring's CookieCsrfTokenRepository, which defaults to exactly
// these names. app-config.spec.ts asserts them against literals, not against these constants.
export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: XSRF_COOKIE_NAME, headerName: XSRF_HEADER_NAME }),
      withInterceptors([authRedirectInterceptor, errorHandlerInterceptor]),
    ),
    provideTranslocoGlobal(),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    {
      provide: LOCALE_ID,
      useFactory: () => (inject(TranslocoService).getActiveLang() === 'fr' ? 'fr-FR' : 'en-GB'),
    },
    provideServiceWorkerRemoval(),
  ],
};
