import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { HoldingDetailPage } from './detail/holding-detail-page';
import { HoldingChanges } from './holding-changes';
import { HoldingListPage } from './list/holding-list-page';

export const HOLDINGS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('holdings'), HoldingChanges],
    children: [
      {
        path: '',
        component: HoldingListPage,
        title: 'pageTitle.holdings',
        data: { headerKey: 'pageTitle.holdings' },
        children: [
          {
            path: ':holdingId',
            component: HoldingDetailPage,
            title: 'pageTitle.holdingDetail',
            data: { headerKey: 'pageTitle.holdings', mobileHeaderHidden: true },
          },
        ],
      },
    ],
  },
];
