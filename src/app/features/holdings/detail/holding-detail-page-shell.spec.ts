import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingDetailPage } from './holding-detail-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

@Component({ selector: 'app-stub-list', template: 'list' })
class StubList {}

describe('HoldingDetailPage shell', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (): Promise<void> => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [
        { path: 'holdings', component: StubList },
        { path: 'holdings/:holdingId', component: HoldingDetailPage, title: 'pageTitle.holdingDetail' },
      ],
      initialRoute: 'holdings/h1',
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => httpTesting.verify());

  it('should keep the back link and a loading status while the holdings load', async () => {
    await renderPage();

    expect(await screen.findByRole('status')).toHaveTextContent('holdings.loading');
    expect(screen.getByTestId('holding-detail-back')).toHaveAttribute('href', '/holdings');
    httpTesting.expectOne('/api/holdings').flush([]);
  });

  it('should tell the user when the holdings could not be loaded', async () => {
    await renderPage();
    httpTesting.expectOne('/api/holdings').flush('boom', { status: 500, statusText: 'Server error' });

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.error');
    expect(screen.getByTestId('holding-detail-back')).toHaveAttribute('href', '/holdings');
  });
});
