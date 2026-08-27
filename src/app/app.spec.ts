import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';

import { AppTitleStrategy } from '@core/i18n/title-strategy';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { App } from './app';

const renderApp = (): Promise<unknown> =>
  render(App, {
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });

// SessionStore is providedIn: 'root' and fetches the session as soon as the shell injects it.
const settleSession = async (): Promise<void> => {
  const http = TestBed.inject(HttpTestingController);

  (await vi.waitFor(() => http.expectOne('/api/session'))).flush({
    displayName: 'Joan Roucoux',
    initials: 'JR',
    passkeys: [],
  });
};

describe('App', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should render the main content area', async () => {
    await renderApp();
    await settleSession();

    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should announce the current page in a live region', async () => {
    await renderApp();
    await settleSession();

    TestBed.inject(AppTitleStrategy).pageTitle.set('Users');

    expect(await screen.findByTestId('route-announcer')).toHaveTextContent('Users');
  });
});
