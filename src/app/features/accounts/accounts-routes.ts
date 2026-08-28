import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { AccountListPage } from './list/account-list-page';
import { AccountListStore } from './list/account-list-store';

export const ACCOUNTS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('accounts')],
    children: [
      {
        path: '',
        component: AccountListPage,
        title: 'pageTitle.accounts',
        providers: [AccountListStore],
      },
    ],
  },
];
