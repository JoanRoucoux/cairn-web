# Angular Sign-In Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Spring Security's generated sign-in page with an Angular `/login` route that matches the rest of the application, using password authentication only.

**Architecture:** Spring stops generating HTML entirely and answers the sign-in POST with a status code instead of a redirect. The SPA owns `/login` as an ordinary route; the proxy stops forwarding it. The passkey ceremony is deliberately out of scope and stays on Spring's own endpoints, which this plan leaves reachable.

**Tech Stack:** Spring Boot 4.1 / Spring Security (`cairn`), Angular 22 with signals, Signal Forms, Transloco and `@joanroucoux/cairn-ui` (`cairn-web`), Caddy (`cairn/cairn.caddy`).

**Spec:** none written; the design was agreed in session and is restated in full below. The two repositories' `AGENTS.md` carry the standing conventions this plan obeys.

## Context

The sign-in page a user sees today is `DefaultLoginPageGeneratingFilter`'s output: unstyled, in
English only, and its failure message is whatever Spring writes. It is also the page that made
three production-only defects hard to see, because it is served by the backend on a path the SPA
otherwise owns.

Two clients means two token shapes and two failure conventions, and the application has already
been bitten by both. This plan removes the second client: after it, Spring serves JSON and nothing
else, and every screen a user meets comes from `cairn-web`.

## Global Constraints

- Everything committed is written in English: code, comments, docs, commit messages, i18n keys, and
  since 2026-09-08, URL segments too.
- Comments flag traps only. If a test already catches the mistake, the comment is redundant.
- Conventional Commits, enforced by commitlint in `cairn-web` and by convention in `cairn`.
- Commit straight to `main` in both repositories. No feature branches.
- `cairn-web` coverage must stay at 100% on statements, branches, functions and lines. The CI
  thresholds are deliberately lower; do not treat them as the target.
- `cairn-web` gates, all four, before any commit: `pnpm run format:check`, `pnpm run lint`,
  `pnpm run test:coverage`, `pnpm run build`.
- `cairn` gates: `./mvnw spotless:apply` then `./mvnw verify` (needs Docker for `*IT`).
- A screen never injects the generated API client; a store does, and the page reads the store.
- Error wording comes from Transloco, never from the server. Every key exists in both `en` and `fr`.
- Do not touch the passkey endpoints (`/webauthn/*`, `/login/webauthn`). They are part two.

## File Structure

**`cairn` (backend)**

| File                                                                                | Responsibility                                                                      |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `cairn-api/src/main/java/com/roucoux/cairn/infrastructure/auth/WebAuthnConfig.java` | modified: point `formLogin` at an external page, answer the POST with a status code |
| `cairn-api/src/test/java/com/roucoux/cairn/infrastructure/auth/SignInIT.java`       | created: drives the real filter chain over HTTP                                     |
| `cairn.caddy`                                                                       | modified: `/login` stops being forwarded to the API                                 |

**`cairn-web` (frontend)**

| File                                                     | Responsibility                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/app/core/interceptors/auth-redirect-interceptor.ts` | modified: a failed sign-in must not trigger a redirect to the sign-in page |
| `src/app/features/login/login-routes.ts`                 | the feature's public API: path, title, scope, store                        |
| `src/app/features/login/credentials.ts`                  | the Signal Forms model and schema                                          |
| `src/app/features/login/login-store.ts`                  | posts the credentials, exposes the outcome                                 |
| `src/app/features/login/login-page.ts` / `.html`         | the screen                                                                 |
| `src/app/features/login/signed-in-guard.ts`              | sends an already-authenticated visitor away                                |
| `src/app/app-routes.ts`                                  | modified: registers the feature                                            |
| `public/i18n/login/en.json`, `public/i18n/login/fr.json` | the feature's wording                                                      |
| `public/i18n/en.json`, `public/i18n/fr.json`             | modified: `pageTitle.login`                                                |

---

### Task 1: Spring answers the sign-in POST instead of rendering it

**Repository:** `cairn`

**Files:**

- Modify: `cairn-api/src/main/java/com/roucoux/cairn/infrastructure/auth/WebAuthnConfig.java`
- Test: `cairn-api/src/test/java/com/roucoux/cairn/infrastructure/auth/SignInIT.java`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `POST /authenticate` with form-encoded `username` and `password`, answering `204` on
  success and `401` on failure. `POST /logout` answering `204`. `GET /login` and `GET /logout` no
  longer served by the backend at all.

- [ ] **Step 1: Write the failing test**

Create `cairn-api/src/test/java/com/roucoux/cairn/infrastructure/auth/SignInIT.java`:

```java
package com.roucoux.cairn.infrastructure.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * Drives the real filter chain, which is the only place the answers below are decided: none of
 * this is reachable from a unit test on a @Bean method.
 */
@SpringBootTest
@TestPropertySource(properties = {"app.security.password=a-real-password", "app.security.permit-all=false"})
class SignInIT {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc() {
        return MockMvcBuilders.webAppContextSetup(context)
                .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void signsInWithTheRightPassword() throws Exception {
        mockMvc().perform(post("/authenticate")
                        .param("username", "joan")
                        .param("password", "a-real-password")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    void answersUnauthorizedRatherThanRedirectingOnAWrongPassword() throws Exception {
        mockMvc().perform(post("/authenticate")
                        .param("username", "joan")
                        .param("password", "wrong")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void servesNoSignInPageOfItsOwn() throws Exception {
        mockMvc().perform(get("/login")).andExpect(status().isUnauthorized());
    }

    @Test
    void servesNoSignOutConfirmationPageEither() throws Exception {
        mockMvc().perform(get("/logout")).andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `./mvnw verify -pl cairn-api -am -Dit.test=SignInIT -Dsurefire.failIfNoSpecifiedTests=false`

Expected: FAIL. `signsInWithTheRightPassword` gets 302 (the default success handler redirects),
`servesNoSignInPageOfItsOwn` gets 200 with Spring's generated HTML.

- [ ] **Step 3: Write the implementation**

In `WebAuthnConfig.securityFilterChain`, replace `.formLogin(Customizer.withDefaults())` with:

```java
                // loginPage points at a page this application does not serve: naming it is what
                // switches off DefaultLoginPageGeneratingFilter, and with it the sign-out
                // confirmation page. cairn-web owns /login; the proxy no longer forwards it here.
                .formLogin(form -> form.loginPage("/login")
                        .loginProcessingUrl("/authenticate")
                        .successHandler((request, response, authentication) ->
                                response.setStatus(HttpStatus.NO_CONTENT.value()))
                        .failureHandler((request, response, exception) ->
                                response.setStatus(HttpStatus.UNAUTHORIZED.value())))
                .logout(logout -> logout.logoutSuccessHandler(
                        (request, response, authentication) -> response.setStatus(HttpStatus.NO_CONTENT.value())))
```

Keep every other call in the chain exactly as it is, `webAuthn`, `csrf`, `exceptionHandling` and
`authorizeHttpRequests` included.

- [ ] **Step 4: Run the test and watch it pass**

Run: `./mvnw verify -pl cairn-api -am -Dit.test=SignInIT -Dsurefire.failIfNoSpecifiedTests=false`

Expected: PASS, 4 tests.

- [ ] **Step 5: Run the whole backend build**

Run: `./mvnw spotless:apply && ./mvnw verify`

Expected: BUILD SUCCESS. If `CucumberIT` fails, check it still sets `app.security.permit-all`; it
must not be affected by this change.

- [ ] **Step 6: Commit**

```bash
git add cairn-api/src/main/java/com/roucoux/cairn/infrastructure/auth/WebAuthnConfig.java \
        cairn-api/src/test/java/com/roucoux/cairn/infrastructure/auth/SignInIT.java
git commit -m "feat(auth): answer the sign-in POST instead of rendering a page

Naming an external loginPage switches off DefaultLoginPageGeneratingFilter and the sign-out
confirmation page with it, leaving only JSON and status codes. The SPA gets 204 or 401 where a
browser form would have followed a redirect it cannot interpret."
```

---

### Task 2: The proxy hands `/login` to the frontend

**Repository:** `cairn`

**Files:**

- Modify: `cairn.caddy`
- Modify: `AGENTS.md` (the Deployment section's routing paragraph)

**Interfaces:**

- Consumes: Task 1's backend, which no longer serves `/login`.
- Produces: `GET /login` served by `web`; `/logout`, `/webauthn/*` and `/login/webauthn` still
  served by `api`; `/api/*` still stripped and forwarded.

- [ ] **Step 1: Change the matcher**

In `cairn.caddy`, replace the `@springOwned` line and its comment with:

```
	# Spring Security serves these itself, at these exact paths, so they are forwarded unchanged.
	# /login is deliberately absent: cairn-web owns the sign-in screen, and Spring's own page is
	# switched off. /login/webauthn is the passkey assertion endpoint, not a page, and stays here.
	@springOwned path /logout* /webauthn/* /login/webauthn
	handle @springOwned {
		reverse_proxy api:8080
	}
```

Leave the `handle_path /api/*` block and the final `handle` block untouched.

- [ ] **Step 2: Start the local stack**

```bash
cd apps/cairn
docker build -t ghcr.io/joanroucoux/cairn-web:local ../cairn-web
export CAIRN_PASSWORD=a-real-password POSTGRES_PASSWORD=a-real-password
export CAIRN_ORIGIN=http://localhost WEB_TAG=local
docker compose --profile migrate up --build schema
docker compose up -d --build
```

- [ ] **Step 3: Verify the routing by hand**

```bash
curl -sS http://localhost/login | grep -o '<title>[^<]*</title>'
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost/api/actuator/health
curl -sS -o /dev/null -w '%{http_code}\n' -X POST http://localhost/api/authenticate
```

Expected: `<title>Cairn</title>` (the SPA, not "Please sign in"), then `200`, then `401` or `403`
(the endpoint exists and refuses; a `404` means the prefix is not being stripped).

- [ ] **Step 4: Update the routing paragraph**

In `AGENTS.md`, inside the Deployment section, change the sentence listing what Spring serves so it
reads `/logout*`, `/webauthn/*` and `/login/webauthn`, and add: `/login` is the frontend's, since
Spring's generated sign-in page is switched off.

- [ ] **Step 5: Commit**

```bash
git add cairn.caddy AGENTS.md
git commit -m "feat(proxy): hand /login to the frontend

Spring no longer generates a sign-in page, so forwarding /login to it would 404. Only the passkey
assertion endpoint keeps its place under that prefix."
```

---

### Task 3: A failed sign-in must not bounce to the sign-in page

**Repository:** `cairn-web`

**Files:**

- Modify: `src/app/core/interceptors/auth-redirect-interceptor.ts`
- Test: `src/app/core/interceptors/auth-redirect-interceptor.spec.ts`

**Interfaces:**

- Consumes: Task 1's `POST /authenticate`, which answers 401 on a wrong password.
- Produces: an interceptor that ignores a 401 from `/authenticate`, so Task 4's store can read it.

- [ ] **Step 1: Write the failing test**

Add to `src/app/core/interceptors/auth-redirect-interceptor.spec.ts`, next to the `/logout` test:

```ts
it('should not redirect when the sign-in attempt itself is refused', async () => {
  http.post('/api/authenticate', null).subscribe({ error: () => undefined });

  controller.expectOne('/api/authenticate').flush(null, { status: 401, statusText: 'Unauthorized' });

  expect(assign).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm run test`

Expected: FAIL, `expected "assign" not to be called`. A wrong password would reload the sign-in
page and throw away what the user typed.

- [ ] **Step 3: Write the implementation**

In `auth-redirect-interceptor.ts`, add a constant beside `SIGN_OUT_URL` and widen the guard:

```ts
const SIGN_OUT_URL = '/logout';
const SIGN_IN_URL = '/authenticate';
```

```ts
// Redirecting on a failing logout would bounce between /logout and /login forever, and
// redirecting on a refused sign-in would reload the page that is already showing.
const ownAuthenticationCall = req.url.endsWith(SIGN_OUT_URL) || req.url.endsWith(SIGN_IN_URL);
if (error instanceof HttpErrorResponse && error.status === 401 && !ownAuthenticationCall) {
  signIn.start();
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm run test`

Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/interceptors/auth-redirect-interceptor.ts \
        src/app/core/interceptors/auth-redirect-interceptor.spec.ts
git commit -m "fix(core): let a refused sign-in reach the screen that asked

A 401 from /authenticate is an answer, not a lost session. Redirecting on it would reload the
sign-in page and discard what the user had typed, without ever showing why."
```

---

### Task 4: The sign-in store

**Repository:** `cairn-web`

**Files:**

- Create: `src/app/features/login/credentials.ts`
- Create: `src/app/features/login/login-store.ts`
- Test: `src/app/features/login/login-store.spec.ts`

**Interfaces:**

- Consumes: Task 1's `POST /authenticate`, Task 3's interceptor.
- Produces: `LoginStore` with `form` (Signal Forms over `Credentials`), `submitting: Signal<boolean>`,
  `refused: Signal<boolean>`, `failed: Signal<boolean>` and `signIn(): Promise<boolean>` returning
  whether the session was opened.

- [ ] **Step 1: Write the form model**

Create `src/app/features/login/credentials.ts`:

```ts
import { type Schema, required, schema } from '@angular/forms/signals';

export type Credentials = {
  username: string;
  password: string;
};

// A factory so each page instance gets its own model object.
export const initialCredentials = (): Credentials => ({ username: '', password: '' });

export const credentialsSchema: Schema<Credentials> = schema((credentials) => {
  required(credentials.username);
  required(credentials.password);
});
```

- [ ] **Step 2: Write the failing test**

Create `src/app/features/login/login-store.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LoginStore } from './login-store';

describe('LoginStore', () => {
  let store: LoginStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), LoginStore],
    });
    store = TestBed.inject(LoginStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should post the credentials the way a form would, which is what Spring reads', async () => {
    store.form.username().value.set('joan');
    store.form.password().value.set('a-real-password');

    const signedIn = store.signIn();
    const request = await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'));

    expect(request.request.headers.get('Content-Type')).toContain('application/x-www-form-urlencoded');
    expect(String(request.request.body)).toBe('username=joan&password=a-real-password');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(await signedIn).toBe(true);
  });

  it('should report a refused password without reporting a breakdown', async () => {
    store.form.username().value.set('joan');
    store.form.password().value.set('wrong');

    const signedIn = store.signIn();
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(await signedIn).toBe(false);
    expect(store.refused()).toBe(true);
    expect(store.failed()).toBe(false);
    expect(store.submitting()).toBe(false);
  });

  it('should tell a breakdown apart from a refusal', async () => {
    store.form.username().value.set('joan');
    store.form.password().value.set('a-real-password');

    const signedIn = store.signIn();
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    expect(await signedIn).toBe(false);
    expect(store.failed()).toBe(true);
    expect(store.refused()).toBe(false);
  });

  it('should clear the previous outcome before trying again', async () => {
    store.form.username().value.set('joan');
    store.form.password().value.set('wrong');
    const first = store.signIn();
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
    await first;

    const second = store.signIn();
    const request = await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'));
    expect(store.refused()).toBe(false);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await second;
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm run test`

Expected: FAIL, the suite cannot resolve `./login-store`.

- [ ] **Step 4: Write the implementation**

Create `src/app/features/login/login-store.ts`:

```ts
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { form } from '@angular/forms/signals';

import { firstValueFrom } from 'rxjs';

import { environment } from '@environments/environment';

import { credentialsSchema, initialCredentials } from './credentials';

@Injectable()
export class LoginStore {
  #http = inject(HttpClient);

  readonly #model = signal(initialCredentials());

  readonly form = form(this.#model, credentialsSchema);

  readonly submitting = signal(false);
  /** The password was wrong. An outcome, not a breakdown, and the only one worth naming. */
  readonly refused = signal(false);
  readonly failed = signal(false);

  async signIn(): Promise<boolean> {
    this.submitting.set(true);
    this.refused.set(false);
    this.failed.set(false);

    const credentials = this.#model();
    // Form encoding, not JSON: Spring's UsernamePasswordAuthenticationFilter reads request
    // parameters, and would see an empty username in a JSON body.
    const body = new URLSearchParams({
      username: credentials.username,
      password: credentials.password,
    }).toString();

    try {
      await firstValueFrom(
        this.#http.post(`${environment.apiBaseUrl}/authenticate`, body, {
          headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        }),
      );
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.refused.set(true);
      } else {
        this.failed.set(true);
      }
      return false;
    } finally {
      this.submitting.set(false);
    }
  }
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm run test`

Expected: PASS, 4 new tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/login/
git commit -m "feat(login): post credentials and name the outcome

A wrong password and a server that never answered are different things to the person typing, so
the store keeps them apart rather than collapsing both into one error flag."
```

---

### Task 5: The sign-in screen

**Repository:** `cairn-web`

**Files:**

- Create: `src/app/features/login/login-page.ts`, `src/app/features/login/login-page.html`
- Create: `src/app/features/login/login-routes.ts`
- Test: `src/app/features/login/login-page.spec.ts`
- Modify: `src/app/app-routes.ts`
- Create: `public/i18n/login/en.json`, `public/i18n/login/fr.json`
- Modify: `public/i18n/en.json`, `public/i18n/fr.json`

**Interfaces:**

- Consumes: Task 4's `LoginStore`.
- Produces: the route `/login`, and `LOGIN_ROUTES` exported from `login-routes.ts`.

- [ ] **Step 1: Write the translations**

Create `public/i18n/login/en.json`:

```json
{
  "title": "Sign in to Cairn",
  "subtitle": "Your portfolio, and nobody else's.",
  "username": "Username",
  "password": "Password",
  "submit": "Sign in",
  "submitting": "Signing in...",
  "refused": "That username and password do not match.",
  "failed": "Sign-in could not be sent. Try again."
}
```

Create `public/i18n/login/fr.json`:

```json
{
  "title": "Connexion a Cairn",
  "subtitle": "Votre portefeuille, et celui de personne d'autre.",
  "username": "Identifiant",
  "password": "Mot de passe",
  "submit": "Se connecter",
  "submitting": "Connexion...",
  "refused": "Cet identifiant et ce mot de passe ne correspondent pas.",
  "failed": "La connexion n'a pas pu etre envoyee. Reessayez."
}
```

Add `"login": "Sign in"` to `pageTitle` in `public/i18n/en.json`, and `"login": "Connexion"` to
`pageTitle` in `public/i18n/fr.json`.

- [ ] **Step 2: Write the failing test**

Create `src/app/features/login/login-page.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DOCUMENT, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { LoginPage } from './login-page';
import { LoginStore } from './login-store';

describe('LoginPage', () => {
  let httpTesting: HttpTestingController;
  let assign: ReturnType<typeof vi.fn>;

  const renderPage = async (): Promise<void> => {
    assign = vi.fn();
    await render(LoginPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('login'),
        { provide: DOCUMENT, useValue: { defaultView: { location: { assign } } } },
        LoginStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
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
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
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
    expect(assign).not.toHaveBeenCalled();
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
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm run test`

Expected: FAIL, the suite cannot resolve `./login-page`.

- [ ] **Step 4: Write the page**

Create `src/app/features/login/login-page.ts`:

```ts
import { Component, DOCUMENT, inject } from '@angular/core';

import { UiButton, UiCard, UiField, UiInput } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { LoginStore } from './login-store';

@Component({
  selector: 'app-login-page',
  imports: [TranslocoPipe, UiButton, UiCard, UiField, UiInput],
  templateUrl: './login-page.html',
})
export class LoginPage {
  #store = inject(LoginStore);
  #document = inject(DOCUMENT);

  protected readonly form = this.#store.form;
  protected readonly submitting = this.#store.submitting;
  protected readonly refused = this.#store.refused;
  protected readonly failed = this.#store.failed;

  protected async onSubmit(): Promise<void> {
    if (!(await this.#store.signIn())) {
      return;
    }

    // A full page load, not a router navigation: the shell and the session store have to start
    // against the session that now exists.
    this.#document.defaultView?.location.assign('/');
  }
}
```

Create `src/app/features/login/login-page.html`:

```html
<div class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
  <h1 class="text-xl font-semibold">{{ 'login.title' | transloco }}</h1>
  <p class="mt-1 text-[13px] text-(--muted-foreground)">{{ 'login.subtitle' | transloco }}</p>

  <ui-card class="mt-6">
    <form class="flex flex-col gap-4" (ngSubmit)="onSubmit()">
      <ui-field [label]="'login.username' | transloco">
        <input autocomplete="username" data-testid="login-username" type="text" uiInput [formField]="form.username" />
      </ui-field>

      <ui-field [label]="'login.password' | transloco">
        <input
          autocomplete="current-password"
          data-testid="login-password"
          type="password"
          uiInput
          [formField]="form.password"
        />
      </ui-field>

      @if (refused()) {
      <p class="text-[12.5px] text-(--negative)" data-testid="login-refused" role="alert">
        {{ 'login.refused' | transloco }}
      </p>
      } @if (failed()) {
      <p class="text-[12.5px] text-(--negative)" data-testid="login-failed" role="alert">
        {{ 'login.failed' | transloco }}
      </p>
      }

      <button data-testid="login-submit" size="lg" type="submit" ui-button [disabled]="submitting()">
        {{ (submitting() ? 'login.submitting' : 'login.submit') | transloco }}
      </button>
    </form>
  </ui-card>
</div>
```

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm run test`

Expected: PASS, 3 new tests.

- [ ] **Step 6: Wire the route**

Create `src/app/features/login/login-routes.ts`:

```ts
import { type Routes } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';

import { LoginPage } from './login-page';
import { LoginStore } from './login-store';

export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    component: LoginPage,
    title: 'pageTitle.login',
    providers: [provideTranslocoScope('login'), LoginStore],
  },
];
```

In `src/app/app-routes.ts`, add before the `path: ''` entry:

```ts
  {
    path: 'login',
    loadChildren: () => import('./features/login/login-routes').then((m) => m.LOGIN_ROUTES),
  },
```

- [ ] **Step 7: Run every gate**

Run: `pnpm run format:check && pnpm run lint && pnpm run test:coverage && pnpm run build`

Expected: all four pass, coverage at 100% on all four counters. `login-routes.ts` is excluded from
coverage by the existing `**/*-routes.ts` rule.

- [ ] **Step 8: Correct the statement this task falsifies**

`AGENTS.md`, under "Deliberate departures from the starter", says of `core/session/`: "There is no
sign-in screen to build: the passkey ceremony lives on the pages Spring Security serves". Half of
that is now false. Change it to say the application owns the password screen and that the passkey
ceremony is still Spring's, until part two.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/login/ src/app/app-routes.ts public/i18n/ AGENTS.md
git commit -m "feat(login): a sign-in screen that looks like the application

Spring's generated page was unstyled, English-only and wrote its own error text, which this
application's convention forbids. The screen now uses the design system and its own translations,
and tells a refused password apart from a server that never answered."
```

---

### Task 6: An authenticated visitor never sees the sign-in screen

**Repository:** `cairn-web`

**Files:**

- Create: `src/app/features/login/signed-in-guard.ts`
- Test: `src/app/features/login/signed-in-guard.spec.ts`
- Modify: `src/app/features/login/login-routes.ts`

**Interfaces:**

- Consumes: `GET /api/session`, which answers 200 with the owner or 401 with nothing.
- Produces: `signedInGuard`, a `CanMatchFn` returning a `RedirectCommand` to `/` for a visitor who
  already has a session, and `true` otherwise.

**Read this before writing the guard.** `SessionStore` has no method that answers "is there a
session": it exposes an `rxResource` and two computed signals, and awaiting a resource from a guard
is not what it is for. The guard asks the server itself. It must ask through `HttpBackend` rather
than `HttpClient`: the redirect interceptor turns any 401 into a full page load of `/login`, which
is the very route this guard protects, so asking through the interceptor chain would loop the
browser exactly as the service worker once did.

- [ ] **Step 1: Write the failing test**

Create `src/app/features/login/signed-in-guard.spec.ts`:

```ts
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
      () => signedInGuard({ path: 'login' }, []) as Promise<boolean | RedirectCommand>,
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm run test`

Expected: FAIL, the suite cannot resolve `./signed-in-guard`.

- [ ] **Step 3: Write the guard**

Create `src/app/features/login/signed-in-guard.ts`:

```ts
import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { type CanMatchFn, RedirectCommand, Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { environment } from '@environments/environment';

/**
 * canMatch rather than canActivate: a refusal falls through to the next route instead of
 * cancelling the navigation, which is what lets the redirect land.
 */
export const signedInGuard: CanMatchFn = async () => {
  // HttpBackend, not HttpClient: the redirect interceptor turns a 401 into a full page load of
  // /login, the route this guard protects, so asking through the interceptor chain would loop the
  // browser on it.
  const http = new HttpClient(inject(HttpBackend));
  const router = inject(Router);

  try {
    await firstValueFrom(http.get(`${environment.apiBaseUrl}/session`));

    return new RedirectCommand(router.parseUrl('/'));
  } catch {
    return true;
  }
};
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm run test`

Expected: PASS, 2 new tests.

- [ ] **Step 5: Prove the guard is not the interceptor's**

Temporarily change `HttpBackend` to `HttpClient` in the guard (`const http = inject(HttpClient);`)
and run `pnpm run test` again. Expected: the second test fails or the suite reports an unexpected
navigation, because the interceptor claims the 401. Put `HttpBackend` back and confirm green. This
is the whole reason the guard is written the way it is; a comment alone would not survive an edit.

- [ ] **Step 6: Wire the guard onto the route**

In `src/app/features/login/login-routes.ts`, import the guard and add it to the single route:

```ts
import { signedInGuard } from './signed-in-guard';
```

```ts
    canMatch: [signedInGuard],
```

- [ ] **Step 7: Run every gate**

Run: `pnpm run format:check && pnpm run lint && pnpm run test:coverage && pnpm run build`

Expected: all four pass, coverage at 100% on all four counters.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/login/
git commit -m "feat(login): keep a signed-in visitor off the sign-in screen

Reaching /login with a live session offered a form that could only confuse: the session it would
open already exists. The guard asks the server through HttpBackend, since asking through the
interceptor chain would turn its own 401 into a navigation to the route it guards."
```

### Task 7: Prove it on the real stack, then release

**Repository:** both

**Files:** none changed unless a defect is found.

**Interfaces:**

- Consumes: everything above.
- Produces: a released `v0.1.2` on both repositories.

- [ ] **Step 1: Build the frontend image and start the stack**

```bash
cd apps/cairn
docker build -t ghcr.io/joanroucoux/cairn-web:local ../cairn-web
export CAIRN_PASSWORD=a-real-password POSTGRES_PASSWORD=a-real-password
export CAIRN_ORIGIN=http://localhost WEB_TAG=local
docker compose --profile migrate up --build schema
docker compose up -d --build
```

- [ ] **Step 2: Sign in with a browser**

Open `http://localhost`. Expected: the application redirects to `/login`, which shows the new
screen, in the design system, in the browser's language.

Type a wrong password. Expected: the refusal message appears, the page does not reload, and what
was typed is still there.

Type the right password. Expected: the application loads with the account name in the sidebar.

Then open `http://localhost/login` again. Expected: it redirects to the portfolio rather than
offering a form.

Then sign out. Expected: the browser lands on `/login` and the session is gone.

- [ ] **Step 3: Confirm the passkey path is untouched**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST http://localhost/webauthn/authenticate/options
```

Expected: `401` or `403`, never `404`. A 404 means the proxy stopped forwarding the passkey
endpoints, which part two depends on.

- [ ] **Step 4: Tear the stack down**

Run: `docker compose down`

The named volume survives; that is intended.

- [ ] **Step 5: Release**

```bash
cd apps/cairn      && git tag v0.1.2 && git push origin v0.1.2
cd apps/cairn-web  && git tag v0.1.2 && git push origin v0.1.2
```

Watch both `Release` workflows. The backend's own check asserts 200 on
`https://cairn.joanroucoux.fr/api/actuator/health`.

- [ ] **Step 6: Verify against production**

```bash
curl -sS https://cairn.joanroucoux.fr/login | grep -o '<title>[^<]*</title>'
```

Expected: `<title>Cairn</title>`. Anything mentioning "Please sign in" means the proxy change did
not ship.

---

## Not in scope

The passkey ceremony, deliberately. Registering and using a passkey still goes through Spring's
`/webauthn/*` endpoints, and the profile screen still links out to `/webauthn/register`, which is
the last page Spring renders. Part two replaces both by driving `navigator.credentials` from the
application, and only then does `DefaultWebAuthnRegistrationPageGeneratingFilter` come out.

Also out of scope: rate limiting a wrong password, and any "remember me" behaviour.
