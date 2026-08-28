import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { InstrumentFormPage } from './form/instrument-form-page';
import { InstrumentFormStore } from './form/instrument-form-store';
import { InstrumentListPage } from './list/instrument-list-page';
import { InstrumentListStore } from './list/instrument-list-store';

export const INSTRUMENTS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideTranslocoScope('instruments')],
    children: [
      {
        path: '',
        component: InstrumentListPage,
        title: 'pageTitle.instruments',
        providers: [InstrumentListStore],
      },
      {
        // Declared before any :instrumentId route so 'nouveau' is not matched as an identifier.
        path: 'nouveau',
        component: InstrumentFormPage,
        title: 'pageTitle.instrumentCreate',
        providers: [InstrumentFormStore],
      },
    ],
  },
];
