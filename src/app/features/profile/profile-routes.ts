import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { preloadScope } from '@core/i18n/preload-scope';

import { ProfilePage } from './profile-page';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('profile')],
    resolve: { translations: preloadScope('profile') },
    children: [
      {
        path: '',
        component: ProfilePage,
        title: 'pageTitle.profile',
        data: { headerKey: 'pageTitle.profile', mobileHeaderless: true },
      },
    ],
  },
];
