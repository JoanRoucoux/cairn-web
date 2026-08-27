import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { HoldingDetailPage } from './detail/holding-detail-page';
import { HoldingDetailStore } from './detail/holding-detail-store';
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
      {
        path: ':holdingId',
        component: HoldingDetailPage,
        title: 'pageTitle.holdingDetail',
        providers: [HoldingDetailStore],
      },
    ],
  },
];
