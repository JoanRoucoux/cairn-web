import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { preloadScope } from '@core/i18n/preload-scope';

import { LoginPage } from './login-page';
import { signedInGuard } from './signed-in-guard';

export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    component: LoginPage,
    title: 'pageTitle.login',
    canMatch: [signedInGuard],
    providers: [provideTranslocoScope('login')],
    resolve: { translations: preloadScope('login') },
  },
];
