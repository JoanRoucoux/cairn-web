import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { type CanMatchFn, RedirectCommand, Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { environment } from '@environments/environment';

/**
 * canMatch rather than canActivate: a refusal falls through to the next route instead of
 * cancelling the navigation, which is what lets the redirect land.
 */
export const signedInGuard: CanMatchFn = async () => {
  const http = new HttpClient(inject(HttpBackend));
  const router = inject(Router);

  try {
    await firstValueFrom(http.get(`${environment.apiBaseUrl}/session`));

    return new RedirectCommand(router.parseUrl('/'));
  } catch {
    return true;
  }
};
