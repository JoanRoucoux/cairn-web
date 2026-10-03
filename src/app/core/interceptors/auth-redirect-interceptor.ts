import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { catchError, throwError } from 'rxjs';

import { SignInRedirect } from './sign-in-redirect';

const SIGN_OUT_URL = '/logout';
const SIGN_IN_URL = '/authenticate';
const PASSKEY_SIGN_IN_URLS = ['/login/webauthn', '/webauthn/authenticate/options'];

export const authRedirectInterceptor: HttpInterceptorFn = (req, next) => {
  const signIn = inject(SignInRedirect);

  return next(req).pipe(
    catchError((error: unknown) => {
      // Redirecting on a failing logout bounces between /logout and /login forever.
      const ownAuthenticationCall =
        req.url.endsWith(SIGN_OUT_URL) ||
        req.url.endsWith(SIGN_IN_URL) ||
        PASSKEY_SIGN_IN_URLS.some((url) => req.url.endsWith(url));
      if (error instanceof HttpErrorResponse && error.status === 401 && !ownAuthenticationCall) {
        signIn.start();
      }

      return throwError(() => error);
    }),
  );
};
