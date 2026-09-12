import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { SourceListPage } from './list/source-list-page';

export const SOURCES_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('sources')],
    children: [
      {
        path: '',
        component: SourceListPage,
        title: 'pageTitle.sources',
      },
    ],
  },
];
