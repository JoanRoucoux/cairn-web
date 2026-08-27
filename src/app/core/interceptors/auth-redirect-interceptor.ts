import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT, inject } from '@angular/core';

import { catchError, throwError } from 'rxjs';

const SIGN_IN_URL = '/login';
const SIGN_OUT_URL = '/logout';

/**
 * Sends the browser to the Spring Security sign-in page when the session is gone. The passkey
 * ceremony happens there, not in this application: there is no login screen to route to.
 */
export const authRedirectInterceptor: HttpInterceptorFn = (req, next) => {
  const document = inject(DOCUMENT);

  return next(req).pipe(
    catchError((error: unknown) => {
      // Redirecting on a failing logout would bounce between /logout and /login forever.
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.endsWith(SIGN_OUT_URL)) {
        document.defaultView?.location.assign(SIGN_IN_URL);
      }

      return throwError(() => error);
    }),
  );
};
