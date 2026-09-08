import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { LoginPage } from './login-page';
import { LoginStore } from './login-store';

export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    component: LoginPage,
    title: 'pageTitle.login',
    providers: [provideTranslocoScope('login'), LoginStore],
  },
];
