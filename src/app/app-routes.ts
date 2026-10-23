import { type Routes } from '@angular/router';

import { NotFoundPage } from '@core/not-found-page/not-found-page';
import { AppShell } from '@core/shell/app-shell';

import { ACCOUNTS_PATHS } from '@features/accounts/contract/accounts-paths';
import { HOLDINGS_PATHS } from '@features/holdings/contract/holdings-paths';
import { LOGIN_PATHS } from '@features/login/contract/login-paths';
import { PORTFOLIO_PATHS } from '@features/portfolio/contract/portfolio-paths';
import { PROFILE_PATHS } from '@features/profile/contract/profile-paths';

export const routes: Routes = [
  {
    path: LOGIN_PATHS.segment,
    loadChildren: () => import('./features/login/login-routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: ACCOUNTS_PATHS.segment,
        loadChildren: () => import('./features/accounts/accounts-routes').then((m) => m.ACCOUNTS_ROUTES),
      },
      {
        path: HOLDINGS_PATHS.segment,
        loadChildren: () => import('./features/holdings/holdings-routes').then((m) => m.HOLDINGS_ROUTES),
      },
      {
        path: PROFILE_PATHS.segment,
        loadChildren: () => import('./features/profile/profile-routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: PORTFOLIO_PATHS.segment,
        loadChildren: () => import('./features/portfolio/portfolio-routes').then((m) => m.PORTFOLIO_ROUTES),
      },
    ],
  },
  {
    path: '**',
    component: NotFoundPage,
    title: 'pageTitle.notFound',
  },
];
