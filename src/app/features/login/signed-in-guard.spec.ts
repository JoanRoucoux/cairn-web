import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentInjector, provideZonelessChangeDetection, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RedirectCommand, provideRouter } from '@angular/router';

import { signedInGuard } from './signed-in-guard';

describe('signedInGuard', () => {
  let httpTesting: HttpTestingController;

  const decide = (): Promise<boolean | RedirectCommand> => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);

    return runInInjectionContext(
      TestBed.inject(EnvironmentInjector),
      () =>
        signedInGuard({ path: 'login' }, [], {} as Parameters<typeof signedInGuard>[2]) as Promise<
          boolean | RedirectCommand
        >,
    );
  };

  afterEach(() => httpTesting.verify());

  it('should send a visitor who already has a session to the portfolio', async () => {
    const decision = decide();

    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush({
      displayName: 'Joan Roucoux',
      initials: 'JR',
      passkeys: [],
    });

    expect(await decision).toBeInstanceOf(RedirectCommand);
  });

  it('should let a visitor with no session reach the screen', async () => {
    const decision = decide();

    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(await decision).toBe(true);
  });
});
