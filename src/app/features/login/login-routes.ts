import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { LoginPage } from './login-page';
import { LoginStore } from './login-store';
import { signedInGuard } from './signed-in-guard';

export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    component: LoginPage,
    title: 'pageTitle.login',
    canMatch: [signedInGuard],
    providers: [provideTranslocoScope('login'), LoginStore],
  },
];
