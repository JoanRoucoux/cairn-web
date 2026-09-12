import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { ProfilePage } from './profile-page';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('profile')],
    children: [
      {
        path: '',
        component: ProfilePage,
        title: 'pageTitle.profile',
      },
    ],
  },
];
