import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { HoldingDetailPage } from './detail/holding-detail-page';
import { HoldingListPage } from './list/holding-list-page';

export const HOLDINGS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('holdings')],
    children: [
      {
        path: '',
        component: HoldingListPage,
        title: 'pageTitle.holdings',
      },
      {
        path: ':holdingId',
        component: HoldingDetailPage,
        title: 'pageTitle.holdingDetail',
      },
    ],
  },
];
