import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { preloadScope } from '@core/i18n/preload-scope';
import type { ShellRouteData } from '@core/shell/shell-route-data';

import { HoldingDetailPage } from './detail/holding-detail-page';
import { HoldingChanges } from './holding-changes';
import { HoldingListPage } from './list/holding-list-page';

export const HOLDINGS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('holdings'), HoldingChanges],
    resolve: { translations: preloadScope('holdings') },
    children: [
      {
        path: '',
        component: HoldingListPage,
        title: 'pageTitle.holdings',
        data: { headerKey: 'pageTitle.holdings' } satisfies ShellRouteData,
        children: [
          {
            path: ':holdingId',
            component: HoldingDetailPage,
            title: 'pageTitle.holdingDetail',
            data: { headerKey: 'pageTitle.holdings', mobileHeaderHidden: true } satisfies ShellRouteData,
          },
        ],
      },
    ],
  },
];
