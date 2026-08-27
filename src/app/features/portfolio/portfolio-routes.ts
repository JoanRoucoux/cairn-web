import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { AllocationPage } from './allocation/allocation-page';
import { AllocationStore } from './allocation/allocation-store';
import { PortfolioPage } from './portfolio-page';
import { PortfolioStore } from './portfolio-store';

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
        // Scoped to this route: created and destroyed with the page.
        providers: [PortfolioStore],
      },
      {
        path: 'repartition',
        component: AllocationPage,
        title: 'pageTitle.allocation',
        providers: [AllocationStore],
      },
    ],
  },
];
