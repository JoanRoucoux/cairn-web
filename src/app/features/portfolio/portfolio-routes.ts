import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { preloadScope } from '@core/i18n/preload-scope';

import { AllocationPage } from './allocation/allocation-page';
import { ALLOCATION_SEGMENT } from './contract/portfolio-paths';
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
        data: { headerKey: 'pageTitle.portfolio' },
      },
      {
        path: ALLOCATION_SEGMENT,
        component: AllocationPage,
        title: 'pageTitle.allocation',
        data: { headerKey: 'pageTitle.allocation' },
      },
    ],
  },
];
