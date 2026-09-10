import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AccountListPage } from './account-list-page';
import { AccountListStore } from './account-list-store';

const accounts = [
  { id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo Bank' },
  { id: 'a2', name: 'Esalia', type: 'PEE', institution: 'Amundi' },
];

describe('AccountListPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (): Promise<Awaited<ReturnType<typeof render>>> => {
    const result = await render(AccountListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('accounts'),
        AccountListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush(accounts);

    return result;
  };

  afterEach(() => httpTesting.verify());

  it('should list the accounts returned by the API', async () => {
    await renderPage();

    expect(await screen.findByText('Saxo Investor')).toBeInTheDocument();
    expect(screen.getByText('Esalia')).toBeInTheDocument();
  });

  it('should tell the user when there is no account', async () => {
    await render(AccountListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('accounts'),
        AccountListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush([]);

    expect(await screen.findByRole('status')).toHaveTextContent('accounts.empty');
  });

  it('should tell the user when accounts fail to load', async () => {
    await render(AccountListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('accounts'),
        AccountListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush('boom', { status: 500, statusText: 'Server error' });

    expect(await screen.findByRole('alert')).toHaveTextContent('accounts.error');
  });

  it('offers exactly the envelopes the contract declares', async () => {
    await renderPage();

    const select = screen.getByTestId('account-type') as HTMLSelectElement;

    expect([...select.options].map((option) => option.value)).toEqual([
      '',
      'PEA',
      'PEA_PME',
      'CTO',
      'PER',
      'PEE',
      'LIFE_INSURANCE',
      'SAVINGS',
      'CRYPTO',
    ]);
  });

  it('should create an account and reload the list', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findByText('Esalia');

    await user.type(screen.getByTestId('account-name'), 'Fortuneo');
    await user.selectOptions(screen.getByTestId('account-type'), 'CTO');
    await user.type(screen.getByTestId('account-institution'), 'Fortuneo Bank');
    await user.click(screen.getByTestId('account-create'));

    const request = await vi.waitFor(() => httpTesting.expectOne((candidate) => candidate.method === 'POST'));
    expect(request.request.body).toEqual({ name: 'Fortuneo', type: 'CTO', institution: 'Fortuneo Bank' });
    request.flush({});

    await vi.waitFor(() =>
      httpTesting
        .expectOne('/api/accounts')
        .flush([...accounts, { id: 'a3', name: 'Fortuneo', type: 'CTO', institution: 'Fortuneo Bank' }]),
    );

    expect(await screen.findByText('Fortuneo')).toBeInTheDocument();
    expect(screen.getByTestId('account-name')).toHaveValue('');
  });

  it('says which fields are missing instead of refusing in silence', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('account-create'));

    expect(screen.getAllByRole('alert')).toHaveLength(3);
    httpTesting.expectNone({ method: 'POST', url: '/api/accounts' });
  });

  it('should report a refused account', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findByText('Esalia');

    await user.type(screen.getByTestId('account-name'), 'Fortuneo');
    await user.selectOptions(screen.getByTestId('account-type'), 'CTO');
    await user.type(screen.getByTestId('account-institution'), 'Fortuneo Bank');
    await user.click(screen.getByTestId('account-create'));

    (await vi.waitFor(() => httpTesting.expectOne((candidate) => candidate.method === 'POST'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('accounts.createError');
  });
});
