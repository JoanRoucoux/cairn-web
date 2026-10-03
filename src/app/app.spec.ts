import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, type Routes, provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';

import { AppTitleStrategy } from '@core/i18n/title-strategy';
import { authRedirectInterceptor } from '@core/interceptors/auth-redirect-interceptor';
import { PageLoad } from '@core/navigation/page-load';
import { AppShell } from '@core/shell/app-shell';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { App } from './app';

const LOGIN_OUTSIDE_SHELL_ROUTES: Routes = [
  {
    path: 'login',
    loadChildren: () => import('@features/login/login-routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: '',
    component: AppShell,
    children: [],
  },
];

const renderApp = (): Promise<unknown> =>
  render(App, {
    imports: [getTranslocoTestingModule()],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: '**', component: AppShell }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });

const settleSession = async (): Promise<void> => {
  const http = TestBed.inject(HttpTestingController);

  (await vi.waitFor(() => http.expectOne('/api/session'))).flush({
    displayName: 'Alex Martin',
    initials: 'AM',
    username: 'alex',
    signInMethod: 'PASSKEY',
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

  it('should not send a signed-out visitor already on /login anywhere', async () => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(LOGIN_OUTSIDE_SHELL_ROUTES),
        provideHttpClient(withInterceptors([authRedirectInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const to = vi.spyOn(TestBed.inject(PageLoad), 'to').mockReturnValue(undefined);
    const httpTesting = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const navigation = TestBed.inject(Router).navigateByUrl('/login');

    for (let round = 0; round < 20; round++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      for (const req of httpTesting.match('/api/session')) {
        req.flush(null, { status: 401, statusText: 'Unauthorized' });
      }
    }
    await navigation;

    expect(to).not.toHaveBeenCalled();
    httpTesting.verify();
  });
});
