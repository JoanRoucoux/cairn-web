import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { preloadScope } from '@core/i18n/preload-scope';
import type { ShellRouteData } from '@core/shell/shell-route-data';

import { AccountListPage } from './list/account-list-page';

export const ACCOUNTS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('accounts')],
    resolve: { translations: preloadScope('accounts') },
    children: [
      {
        path: '',
        component: AccountListPage,
        title: 'pageTitle.accounts',
        data: { headerKey: 'pageTitle.accounts' } satisfies ShellRouteData,
      },
    ],
  },
];
