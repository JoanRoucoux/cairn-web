# cairn-web

Cairn — Angular application generated from [angular-starter-web](https://github.com/JoanRoucoux/angular-starter-web) v1.5.0.

## Getting started

```bash
pnpm install    # installs dependencies and generates the API clients (postinstall)
pnpm start      # dev server on http://localhost:4200
```

Calls to `/api` are proxied to `http://localhost:8080` by the dev proxy ([proxy.conf.json](proxy.conf.json)): adjust the target to your backend.

## Scripts

| Script                   | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `pnpm start`             | Dev server (with API proxy)                          |
| `pnpm run build`         | Production build into `dist/`                        |
| `pnpm test`              | Unit tests (Vitest)                                  |
| `pnpm run test:coverage` | Unit tests with coverage report and thresholds       |
| `pnpm run e2e`           | End-to-end tests (Playwright)                        |
| `pnpm run lint`          | Lint (ESLint, includes Sheriff module boundaries)    |
| `pnpm run format`        | Format the whole project (Prettier)                  |
| `pnpm run generate:api`  | Regenerates clients and models from the OpenAPI spec |

## Features

- `accounts`, `holdings`, `instruments`, `portfolio`, `profile`, `sources` — the business features, one folder per screen.
- `core/shell/` — the app's navigation chrome (sidebar on desktop, tab bar on mobile), added on top of the starter, which ships none. `core/theme/` and `core/session/` are two more additions specific to this app. See "Deliberate departures from the starter" in [AGENTS.md](AGENTS.md) for why.

See [AGENTS.md](AGENTS.md) for the architecture, conventions and testing guidelines inherited from the starter.
