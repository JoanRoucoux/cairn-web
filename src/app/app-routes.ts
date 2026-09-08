import { type Routes } from '@angular/router';

import { NotFoundPage } from '@core/not-found-page/not-found-page';

import { PORTFOLIO_ROUTES } from '@features/portfolio/portfolio-routes';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login-routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: 'accounts',
    loadChildren: () => import('./features/accounts/accounts-routes').then((m) => m.ACCOUNTS_ROUTES),
  },
  {
    path: 'holdings',
    loadChildren: () => import('./features/holdings/holdings-routes').then((m) => m.HOLDINGS_ROUTES),
  },
  {
    path: 'instruments',
    loadChildren: () => import('./features/instruments/instruments-routes').then((m) => m.INSTRUMENTS_ROUTES),
  },
  {
    path: 'sources',
    loadChildren: () => import('./features/sources/sources-routes').then((m) => m.SOURCES_ROUTES),
  },
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile-routes').then((m) => m.PROFILE_ROUTES),
  },
  // Eagerly load the landing feature. Its translations still load lazily with the scope.
  {
    path: '',
    children: PORTFOLIO_ROUTES,
  },
  // Fallback route, keep it at the end.
  {
    path: '**',
    component: NotFoundPage,
    title: 'pageTitle.notFound',
  },
];
