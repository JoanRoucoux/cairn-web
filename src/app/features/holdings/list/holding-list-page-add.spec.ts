import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const accounts = [{ id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' }];

describe('HoldingListPage add query param', () => {
  let httpTesting: HttpTestingController;

  const open = async (initialRoute: string): Promise<void> => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: '', component: HoldingListPage }],
      initialRoute,
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    for (const request of httpTesting.match('/api/holdings')) {
      request.flush([]);
    }
    for (const request of httpTesting.match('/api/accounts')) {
      request.flush(accounts);
    }
  };

  afterEach(() => httpTesting.verify());

  it('opens the add dialog with the account of the add query param, then clears it', async () => {
    await open('/?add=a1');

    expect(await screen.findByTestId('holding-add-dialog')).toBeInTheDocument();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    await vi.waitFor(() => expect(screen.getByTestId('holding-add-account')).toHaveValue('a1'));
    httpTesting.match('/api/instruments').forEach((request) => request.flush([]));
  });

  it('opens the add dialog with the search of the q param and the default account, then clears both params', async () => {
    await open('/?add=&q=zzz');

    expect(await screen.findByTestId('holding-add-dialog')).toBeInTheDocument();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    await vi.waitFor(() => expect(screen.getByTestId('holding-add-query')).toHaveValue('zzz'));
    await vi.waitFor(() => expect(screen.getByTestId('holding-add-account')).toHaveValue('a1'));
    httpTesting.match('/api/instruments').forEach((request) => request.flush([]));
    httpTesting.match('/api/instruments/resolve').forEach((request) => request.flush([]));

    await userEvent.setup().click(screen.getByTestId('holding-add-cancel'));
    await vi.waitFor(() => expect(screen.queryByTestId('holding-add-dialog')).not.toBeInTheDocument());
  });
});
