import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { preloadScope } from '@core/i18n/preload-scope';
import type { ShellRouteData } from '@core/shell/shell-route-data';

import { AllocationPage } from './allocation/allocation-page';
import { PORTFOLIO_PATHS } from './contract/portfolio-paths';
import { PortfolioPage } from './portfolio-page';

export const PORTFOLIO_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('portfolio')],
    resolve: { translations: preloadScope('portfolio') },
    children: [
      {
        path: '',
        component: PortfolioPage,
        title: 'pageTitle.portfolio',
        data: { headerKey: 'pageTitle.portfolio' } satisfies ShellRouteData,
      },
      {
        path: PORTFOLIO_PATHS.allocationSegment,
        component: AllocationPage,
        title: 'pageTitle.allocation',
        data: { headerKey: 'pageTitle.allocation' } satisfies ShellRouteData,
      },
    ],
  },
];
