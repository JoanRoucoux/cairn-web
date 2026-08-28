import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { SourceListPage } from './list/source-list-page';
import { SourceListStore } from './list/source-list-store';

export const SOURCES_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('sources')],
    children: [
      {
        path: '',
        component: SourceListPage,
        title: 'pageTitle.sources',
        providers: [SourceListStore],
      },
    ],
  },
];
