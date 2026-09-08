import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { catchError, throwError } from 'rxjs';

import { SignInRedirect } from './sign-in-redirect';

const SIGN_OUT_URL = '/logout';
const SIGN_IN_URL = '/authenticate';

/**
 * Sends the browser to the application's sign-in screen when the session is gone.
 */
export const authRedirectInterceptor: HttpInterceptorFn = (req, next) => {
  const signIn = inject(SignInRedirect);

  return next(req).pipe(
    catchError((error: unknown) => {
      // Redirecting on a failing logout would bounce between /logout and /login forever, and
      // redirecting on a refused sign-in would reload the page that is already showing.
      const ownAuthenticationCall = req.url.endsWith(SIGN_OUT_URL) || req.url.endsWith(SIGN_IN_URL);
      if (error instanceof HttpErrorResponse && error.status === 401 && !ownAuthenticationCall) {
        signIn.start();
      }

      return throwError(() => error);
    }),
  );
};
