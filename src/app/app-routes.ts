import { type Routes } from '@angular/router';

import { NotFoundPage } from '@core/not-found-page/not-found-page';

import { PORTFOLIO_ROUTES } from '@features/portfolio/portfolio-routes';

export const routes: Routes = [
  {
    path: 'comptes',
    loadChildren: () => import('./features/accounts/accounts-routes').then((m) => m.ACCOUNTS_ROUTES),
  },
  {
    path: 'positions',
    loadChildren: () => import('./features/holdings/holdings-routes').then((m) => m.HOLDINGS_ROUTES),
  },
  {
    path: 'instruments',
    loadChildren: () => import('./features/instruments/instruments-routes').then((m) => m.INSTRUMENTS_ROUTES),
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
