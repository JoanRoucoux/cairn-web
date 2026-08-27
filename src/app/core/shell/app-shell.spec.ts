import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AppShell } from './app-shell';

const renderShell = (): ReturnType<typeof render<AppShell>> =>
  render(AppShell, {
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

describe('AppShell', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should expose the primary navigation under a name', async () => {
    await renderShell();
    await settleSession();

    expect(screen.getByRole('navigation', { name: 'shell.primary' })).toBeInTheDocument();
  });

  it('should render one link per destination in each layout', async () => {
    await renderShell();
    await settleSession();

    // The sidebar and the tab bar are both in the DOM; CSS decides which one is visible.
    expect(screen.getAllByRole('link', { name: 'shell.holdings' })).toHaveLength(2);
  });

  it('should offer a way into the account screen', async () => {
    await renderShell();
    await settleSession();

    expect(screen.getAllByRole('link', { name: 'shell.account' }).length).toBeGreaterThan(0);
  });

  it('should name the signed-in owner once the session answers', async () => {
    await renderShell();
    await settleSession();

    expect(await screen.findByText('Joan Roucoux')).toBeInTheDocument();
  });

  it('should stay usable while the session is still loading', async () => {
    await renderShell();

    expect(screen.getAllByRole('link', { name: 'shell.account' }).length).toBeGreaterThan(0);

    await settleSession();
  });

  it('should give the skip link a target', async () => {
    const { container } = await renderShell();
    await settleSession();

    expect(screen.getByRole('link', { name: 'shell.skipToContent' })).toHaveAttribute('href', '#main-content');
    expect(container.querySelector('#main-content')).toBeInTheDocument();
  });
});
