import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { HoldingListPage } from './list/holding-list-page';
import { HoldingListStore } from './list/holding-list-store';

export const HOLDINGS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('holdings')],
    children: [
      {
        path: '',
        component: HoldingListPage,
        title: 'pageTitle.holdings',
        providers: [HoldingListStore],
      },
    ],
  },
];
