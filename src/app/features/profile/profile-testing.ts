import type { HttpTestingController } from '@angular/common/http/testing';

import { vi } from 'vitest';

export const session = {
  displayName: 'Alex',
  initials: 'AL',
  username: 'alex',
  signInMethod: 'PASSKEY',
};

export const passkeys: Record<string, unknown>[] = [
  {
    credentialId: 'aXBob25l',
    label: "iPhone d'Alex",
    createdAt: '2025-03-12T10:00:00Z',
    lastUsedAt: '2026-09-25T08:00:00Z',
    current: true,
    provider: 'ICLOUD_KEYCHAIN',
  },
  {
    credentialId: 'bWFj',
    label: 'MacBook',
    createdAt: '2025-03-12T10:05:00Z',
    lastUsedAt: '2026-09-24T20:00:00Z',
    current: false,
    provider: null,
  },
  {
    credentialId: 'eXVi',
    label: 'YubiKey 5C',
    createdAt: '2025-11-04T10:00:00Z',
    lastUsedAt: '2026-09-02T09:00:00Z',
    current: false,
    provider: 'SECURITY_KEY',
  },
  { credentialId: 'bmV2ZXI', label: 'Neuf', createdAt: '2026-09-20T10:00:00Z', lastUsedAt: null, current: false },
];

export const flushCall = async (
  http: HttpTestingController,
  url: string,
  body: object | null,
  failure?: { status: number },
): Promise<void> => {
  const request = await vi.waitFor(() => http.expectOne(url));

  if (failure) {
    request.flush(null, { status: failure.status, statusText: 'Error' });
  } else {
    request.flush(body);
  }
};

export const settleProfile = async (
  http: HttpTestingController,
  data: { session?: object; passkeys?: object[]; instruments?: object[] } = {},
): Promise<void> => {
  await flushCall(http, '/api/session', (data.session ?? session) as object);
  await flushCall(http, '/api/session/passkeys', data.passkeys ?? passkeys);
  await flushCall(http, '/api/instruments', data.instruments ?? [{}, {}, {}]);
};
