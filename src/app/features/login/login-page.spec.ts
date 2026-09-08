import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { PageLoad } from '@core/navigation/page-load';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { LoginPage } from './login-page';
import { LoginStore } from './login-store';

describe('LoginPage', () => {
  let httpTesting: HttpTestingController;
  let load: ReturnType<typeof vi.spyOn>;

  const renderPage = async (): Promise<void> => {
    await render(LoginPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('login'),

        LoginStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    load = vi.spyOn(TestBed.inject(PageLoad), 'to');
  };

  afterEach(() => httpTesting.verify());

  const fillIn = async (user: ReturnType<typeof userEvent.setup>, password: string): Promise<void> => {
    await user.type(screen.getByTestId('login-username'), 'joan');
    await user.type(screen.getByTestId('login-password'), password);
    await user.click(screen.getByTestId('login-submit'));
  };

  it('should reload the application once the session is open', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillIn(user, 'a-real-password');
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    // A router navigation would leave the application running without the session it just opened.
    await vi.waitFor(() => expect(load).toHaveBeenCalledWith('/'));
  });

  it('should say so when the password is refused, and stay put', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillIn(user, 'wrong');
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(await screen.findByTestId('login-refused')).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it('should send no request when submitted empty', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('login-submit'));

    httpTesting.expectNone('/api/authenticate');
  });

  it('should tell a breakdown apart from a refusal', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillIn(user, 'a-real-password');
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    expect(await screen.findByTestId('login-failed')).toBeInTheDocument();
    expect(screen.queryByTestId('login-refused')).not.toBeInTheDocument();
  });
});
