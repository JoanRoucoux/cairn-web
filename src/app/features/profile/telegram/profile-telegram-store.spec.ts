import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ProfileTelegramStore } from './profile-telegram-store';

const LINK = '/api/session/telegram/link';
const CHECK = '/api/session/telegram/link/check';
const invitation = (expiresAt: string): { url: string; expiresAt: string } => ({
  url: 'https://t.me/cairn_bot?start=abc',
  expiresAt,
});
const linked = { status: 'linked', chatLabel: '@alex', linkedAt: '2026-10-24T09:00:00Z' };

describe('ProfileTelegramStore', () => {
  let store: ProfileTelegramStore;
  let httpTesting: HttpTestingController;

  const load = async (body: object = { status: 'unlinked' }): Promise<void> => {
    TestBed.tick();
    httpTesting.expectOne('/api/session/telegram').flush(body);
    await TestBed.inject(ApplicationRef).whenStable();
    vi.useFakeTimers({
      now: new Date('2026-10-24T09:00:00Z'),
      toFake: ['setTimeout', 'clearTimeout', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'],
      shouldClearNativeTimers: true,
    });
  };

  const connect = async (expiresAt = '2026-10-24T09:10:00Z'): Promise<void> => {
    const connecting = store.connect();
    httpTesting.expectOne({ method: 'POST', url: LINK }).flush(invitation(expiresAt));
    await connecting;
  };

  const tick = async (ms: number, answer?: { body?: object; status?: number }): Promise<void> => {
    await vi.advanceTimersByTimeAsync(ms);

    if (answer) {
      const request = httpTesting.expectOne(CHECK);

      if (answer.status) {
        request.flush(null, { status: answer.status, statusText: 'Error' });
      } else {
        request.flush(answer.body ?? null);
      }

      await vi.advanceTimersByTimeAsync(0);
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ProfileTelegramStore,
      ],
    });
    store = TestBed.inject(ProfileTelegramStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.useRealTimers();
  });

  it('reads the link status from the server', async () => {
    expect(store.ready()).toBe(false);
    expect(store.status()).toBe('unavailable');

    await load(linked);

    expect(store.ready()).toBe(true);
    expect(store.status()).toBe('linked');
    expect(store.chatLabel()).toBe('@alex');
    expect(store.linkedAt()).toBe('10/24/2026');
  });

  it('has no chat to show while unlinked', async () => {
    await load();

    expect(store.chatLabel()).toBe('');
    expect(store.linkedAt()).toBe('');
  });

  it('flags the failure when the initial read fails', async () => {
    TestBed.tick();
    httpTesting.expectOne('/api/session/telegram').flush(null, { status: 500, statusText: 'Error' });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.failed()).toBe(true);
    expect(store.ready()).toBe(false);
  });

  it('connectExposesTheInvitationUrlAndPolls', async () => {
    await load();

    await connect();

    expect(store.invitationUrl()).toBe('https://t.me/cairn_bot?start=abc');
    expect(store.status()).toBe('pending');

    await tick(3000, { body: { status: 'pending' } });
    await tick(3000, { body: { status: 'pending' } });

    expect(store.status()).toBe('pending');
  });

  it('pollingStopsOnceLinked', async () => {
    await load();
    await connect();

    await tick(3000, { body: linked });

    expect(store.status()).toBe('linked');
    expect(store.chatLabel()).toBe('@alex');
    expect(store.invitationUrl()).toBeNull();

    await vi.advanceTimersByTimeAsync(9000);
    httpTesting.expectNone(CHECK);
  });

  it('pollingStopsAfterExpiryAndShowsUnlinked', async () => {
    await load();
    await connect('2026-10-24T09:00:07Z');

    await tick(3000, { body: { status: 'unlinked' } });
    expect(store.status()).toBe('pending');

    await tick(3000, { body: { status: 'unlinked' } });
    expect(store.status()).toBe('pending');

    await tick(3000, { body: { status: 'unlinked' } });
    expect(store.status()).toBe('unlinked');
    expect(store.expired()).toBe(true);
    expect(store.invitationUrl()).toBeNull();

    await vi.advanceTimersByTimeAsync(9000);
    httpTesting.expectNone(CHECK);
  });

  it('aFailedCheckStopsPollingAndFlagsTheFailure', async () => {
    await load();
    await connect();

    await tick(3000, { status: 502 });

    expect(store.failed()).toBe(true);
    expect(store.status()).toBe('unlinked');
    expect(store.invitationUrl()).toBeNull();

    await vi.advanceTimersByTimeAsync(6000);
    httpTesting.expectNone(CHECK);
  });

  it('flags a failed connect and keeps the status', async () => {
    await load();

    const connecting = store.connect();
    httpTesting.expectOne({ method: 'POST', url: LINK }).flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(await connecting).toBe(false);
    expect(store.failed()).toBe(true);
    expect(store.status()).toBe('unlinked');
    expect(store.busy()).toBe(false);
  });

  it('shows a token pending on the server as unlinked while this page holds no invitation', async () => {
    await load({ status: 'pending' });

    expect(store.status()).toBe('unlinked');
  });

  it('aLateCheckResultAfterPollingStoppedIsIgnored', async () => {
    await load();
    await connect();

    await vi.advanceTimersByTimeAsync(3000);
    const inFlight = httpTesting.expectOne(CHECK);
    const disconnecting = store.disconnect();
    httpTesting.expectOne({ method: 'DELETE', url: LINK }).flush(null, { status: 204, statusText: 'No Content' });
    await disconnecting;
    inFlight.flush(linked);
    await vi.advanceTimersByTimeAsync(0);

    expect(store.status()).toBe('unlinked');
    expect(store.chatLabel()).toBe('');
  });

  it('aLateCheckFailureAfterPollingStoppedIsIgnored', async () => {
    await load();
    await connect();

    await vi.advanceTimersByTimeAsync(3000);
    const inFlight = httpTesting.expectOne(CHECK);
    const disconnecting = store.disconnect();
    httpTesting.expectOne({ method: 'DELETE', url: LINK }).flush(null, { status: 204, statusText: 'No Content' });
    await disconnecting;
    inFlight.flush(null, { status: 502, statusText: 'Bad Gateway' });
    await vi.advanceTimersByTimeAsync(0);

    expect(store.status()).toBe('unlinked');
    expect(store.failed()).toBe(false);
  });

  it('aSlowCheckDelaysTheNextOneInsteadOfOverlapping', async () => {
    await load();
    await connect();

    await vi.advanceTimersByTimeAsync(3000);
    const slow = httpTesting.expectOne(CHECK);

    await vi.advanceTimersByTimeAsync(3000);
    httpTesting.expectNone(CHECK);

    slow.flush({ status: 'pending' });
    await vi.advanceTimersByTimeAsync(2999);
    httpTesting.expectNone(CHECK);

    await vi.advanceTimersByTimeAsync(1);
    httpTesting.expectOne(CHECK).flush({ status: 'pending' });
    await vi.advanceTimersByTimeAsync(0);

    expect(store.status()).toBe('pending');
  });

  it('pollingStopsWhenTheSectionIsDestroyed', async () => {
    await load();
    await connect();

    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(9000);

    httpTesting.expectNone(CHECK);
  });

  it('disconnectAnswersUnlinked', async () => {
    await load(linked);

    const disconnecting = store.disconnect();
    httpTesting.expectOne({ method: 'DELETE', url: LINK }).flush(null, { status: 204, statusText: 'No Content' });

    expect(await disconnecting).toBe(true);
    expect(store.status()).toBe('unlinked');
  });

  it('flags a failed disconnect', async () => {
    await load(linked);

    const disconnecting = store.disconnect();
    httpTesting.expectOne({ method: 'DELETE', url: LINK }).flush(null, { status: 500, statusText: 'Error' });

    expect(await disconnecting).toBe(false);
    expect(store.failed()).toBe(false);
    expect(store.status()).toBe('linked');
  });
});
