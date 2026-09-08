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

// Mirrors app-routes.ts's shape (login as a sibling of the AppShell layout route) without pulling
// every lazy feature into this spec's module graph.
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

    // The guard and (on the unfixed app) the shell each ask for the session independently, and
    // the login feature is lazy, so several ticks are needed before either request exists.
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
