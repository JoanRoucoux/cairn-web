import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { InstrumentFormPage } from './form/instrument-form-page';
import { InstrumentListPage } from './list/instrument-list-page';

export const INSTRUMENTS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('instruments')],
    children: [
      {
        path: '',
        component: InstrumentListPage,
        title: 'pageTitle.instruments',
      },
      {
        // Declared before any :instrumentId route so 'new' is not matched as an identifier.
        path: 'new',
        component: InstrumentFormPage,
        title: 'pageTitle.instrumentCreate',
      },
      {
        path: ':instrumentId',
        component: InstrumentFormPage,
        title: 'pageTitle.instrumentEdit',
      },
    ],
  },
];
