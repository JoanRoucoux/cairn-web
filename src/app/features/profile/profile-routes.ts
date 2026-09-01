import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { PortfolioImportStore } from './portfolio-import-store';
import { ProfilePage } from './profile-page';
import { ProfileStore } from './profile-store';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('profile'), ProfileStore, PortfolioImportStore],
    children: [
      {
        path: '',
        component: ProfilePage,
        title: 'pageTitle.profile',
      },
    ],
  },
];
