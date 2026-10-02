import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const livret = { id: 'a3', name: 'Livret A', type: 'SAVINGS', institution: 'Fortuneo' };
const saxo = { id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' };

describe('HoldingListPage balance query param', () => {
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
      request.flush([saxo, livret]);
    }
  };

  afterEach(() => httpTesting.verify());

  it('opens the balance dialog of a savings account, then clears the param', async () => {
    await open('/?balance=a3');

    expect(await screen.findByTestId('holding-cash-dialog')).toHaveTextContent('holdings.balance.title');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    expect(screen.queryByText('holdings.cash.zeroHint')).not.toBeInTheDocument();
  });

  it('ignores a param that names no account, and clears it', async () => {
    await open('/?balance=nope');

    await screen.findAllByText('Livret A');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    expect(screen.queryByTestId('holding-cash-dialog')).not.toBeInTheDocument();
  });
});
