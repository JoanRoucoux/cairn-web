import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { tap } from 'rxjs';

import { Logger } from '@core/logger/logger';

import { environment } from '@environments/environment';

/**
 * Logs every API error in one place, and does nothing else on purpose.
 *
 * Showing the failure is the job of the screen that asked: each store owns an `error` signal and
 * each screen renders it next to the action that failed, where the user is already looking. A
 * toaster raised from here would either duplicate that message or replace it with one this
 * interceptor has no context to write.
 */
export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(Logger);

  return next(req).pipe(
    tap({
      error: (error: unknown) => {
        // Only handle errors coming from our API, not third-party resources.
        if (!req.url.startsWith(environment.apiBaseUrl)) {
          return;
        }
        if (error instanceof HttpErrorResponse) {
          logger.error('HttpInterceptor', `API error on ${req.method} ${req.url}`, error);
        }
      },
    }),
  );
};
