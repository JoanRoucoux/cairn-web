import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type ActivatedRoute, provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AppShell, deepestData } from './app-shell';

@Component({ selector: 'app-stub', template: '' })
class StubPage {}

const renderShell = (routes: Parameters<typeof provideRouter>[0] = []): ReturnType<typeof render<AppShell>> =>
  render(AppShell, {
    imports: [getTranslocoTestingModule()],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });

const settleSession = async (): Promise<void> => {
  const http = TestBed.inject(HttpTestingController);

  (await vi.waitFor(() => http.expectOne('/api/session'))).flush({
    displayName: 'Joan Roucoux',
    initials: 'JR',
    username: 'joan',
    signInMethod: 'PASSKEY',
  });
};

describe('deepestData', () => {
  it('falls back to an empty record when a child route has not attached its snapshot yet', () => {
    const partiallyActivated = { firstChild: null } as unknown as ActivatedRoute;

    expect(deepestData(partiallyActivated)).toEqual({});
  });
});

describe('AppShell', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should expose the primary navigation under a name', async () => {
    await renderShell();
    await settleSession();

    expect(screen.getAllByRole('navigation', { name: 'shell.primary' })).toHaveLength(2);
  });

  it('should render one link per destination in the sidebar and the tab bar', async () => {
    await renderShell();
    await settleSession();

    expect(screen.getAllByRole('link', { name: 'shell.holdings' })).toHaveLength(2);
  });

  it('should offer the four destinations, with accounts instead of sources', async () => {
    await renderShell();
    await settleSession();

    expect(screen.getAllByRole('link', { name: 'shell.portfolio' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'shell.holdings' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'shell.allocation' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'shell.accounts' })).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'shell.sources' })).not.toBeInTheDocument();
  });

  it('should mark the destination matching the current URL as the current page', async () => {
    await renderShell([{ path: '', component: StubPage }]);
    await settleSession();

    expect(screen.getAllByRole('link', { name: 'shell.portfolio' })[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link', { name: 'shell.holdings' })[0]).not.toHaveAttribute('aria-current');
  });

  it('should offer a way into the account screen', async () => {
    await renderShell();
    await settleSession();

    expect(screen.getByRole('link', { name: 'pageTitle.profile' })).toHaveAttribute('href', '/profile');
  });

  it('should show the signed-in owner initials on the avatar once the session answers', async () => {
    await renderShell();
    await settleSession();

    expect(await screen.findByText('JR')).toBeInTheDocument();
  });

  it('should stay usable while the session is still loading', async () => {
    await renderShell();

    expect(screen.getByRole('link', { name: 'pageTitle.profile' })).toBeInTheDocument();

    await settleSession();
  });

  it('should show the translated header key of the current route', async () => {
    await renderShell([{ path: '', component: StubPage, data: { headerKey: 'shell.portfolio' } }]);
    await settleSession();

    expect(await screen.findByRole('heading', { level: 1, name: 'shell.portfolio' })).toBeInTheDocument();
  });

  it('should show no header title for a route without a headerKey', async () => {
    await renderShell([{ path: '', component: StubPage }]);
    await settleSession();

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('should show a desktop-only back link before the title for a route with a headerBack', async () => {
    await renderShell([
      {
        path: '',
        component: StubPage,
        data: { headerKey: 'shell.portfolio', headerBack: { labelKey: 'pageTitle.profile', path: '/profile' } },
      },
    ]);
    await settleSession();

    const back = await screen.findByTestId('header-back');

    expect(back).toHaveAttribute('href', '/profile');
    expect(back).toHaveClass('max-lg:hidden');
  });

  it('should drop the header and the top padding on mobile for a route flagged mobileHeaderless', async () => {
    await renderShell([
      { path: '', component: StubPage, data: { headerKey: 'shell.portfolio', mobileHeaderless: true } },
    ]);
    await settleSession();

    await screen.findByRole('heading', { level: 1, name: 'shell.portfolio' });

    expect(screen.getByRole('banner')).toHaveClass('max-lg:hidden');
    expect(screen.getByRole('main').firstElementChild).toHaveClass('max-lg:pt-0');
  });

  it('should hide the header title on mobile for a route flagged mobileHeaderHidden', async () => {
    await renderShell([
      { path: '', component: StubPage, data: { headerKey: 'shell.portfolio', mobileHeaderHidden: true } },
    ]);
    await settleSession();

    expect(await screen.findByRole('heading', { level: 1, name: 'shell.portfolio' })).toHaveClass('max-lg:hidden');
  });

  it('should keep the header on mobile without the flag', async () => {
    const { container } = await renderShell([
      { path: '', component: StubPage, data: { headerKey: 'shell.portfolio' } },
    ]);
    await settleSession();

    await screen.findByRole('heading', { level: 1, name: 'shell.portfolio' });
    expect(container.querySelector('header')).not.toHaveClass('max-lg:hidden');
  });

  it('should keep the header title visible on mobile without the flag', async () => {
    await renderShell([{ path: '', component: StubPage, data: { headerKey: 'shell.portfolio' } }]);
    await settleSession();

    expect(await screen.findByRole('heading', { level: 1, name: 'shell.portfolio' })).not.toHaveClass('max-lg:hidden');
  });

  it('should give the skip link a target', async () => {
    const { container } = await renderShell();
    await settleSession();

    expect(screen.getByRole('link', { name: 'shell.skipToContent' })).toHaveAttribute('href', '#main-content');
    expect(container.querySelector('#main-content')).toBeInTheDocument();
  });
});
