import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { AllocationPage } from './allocation/allocation-page';
import { PortfolioPage } from './portfolio-page';

export const PORTFOLIO_ROUTES: Routes = [
  {
    path: '',
    // Load the feature translations (public/i18n/portfolio/) alongside the feature.
    providers: [provideTranslocoScope('portfolio')],
    children: [
      {
        path: '',
        component: PortfolioPage,
        title: 'pageTitle.portfolio',
      },
      {
        path: 'allocation',
        component: AllocationPage,
        title: 'pageTitle.allocation',
      },
    ],
  },
];
