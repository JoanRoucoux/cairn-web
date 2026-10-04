import { type Routes } from '@angular/router';

import { NotFoundPage } from '@core/not-found-page/not-found-page';
import { AppShell } from '@core/shell/app-shell';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login-routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: 'accounts',
        loadChildren: () => import('./features/accounts/accounts-routes').then((m) => m.ACCOUNTS_ROUTES),
      },
      {
        path: 'holdings',
        loadChildren: () => import('./features/holdings/holdings-routes').then((m) => m.HOLDINGS_ROUTES),
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile-routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('./features/portfolio/portfolio-routes').then((m) => m.PORTFOLIO_ROUTES),
      },
    ],
  },
  // Fallback route, keep it at the end.
  {
    path: '**',
    component: NotFoundPage,
    title: 'pageTitle.notFound',
  },
];
