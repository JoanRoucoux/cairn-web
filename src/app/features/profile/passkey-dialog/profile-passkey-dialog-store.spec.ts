import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PasskeyCeremony, type PasskeyOutcome } from '@core/webauthn/passkey-ceremony';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { ProfilePasskeyDialogStore } from './profile-passkey-dialog-store';

describe('ProfilePasskeyDialogStore', () => {
  let store: ProfilePasskeyDialogStore;
  let register: ReturnType<typeof vi.fn<() => Promise<PasskeyOutcome>>>;

  beforeEach(() => {
    register = vi.fn();
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PasskeyCeremony, useValue: { register } },
        ProfilePasskeyDialogStore,
      ],
    });
    store = TestBed.inject(ProfilePasskeyDialogStore);
  });

  it('should send no ceremony when the label is empty', async () => {
    expect(await store.register()).toBe(false);

    expect(register).not.toHaveBeenCalled();
  });

  it('should send no ceremony when the label is over 64 characters', async () => {
    store.form.label().value.set('a'.repeat(65));

    expect(await store.register()).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('should register once the ceremony succeeds', async () => {
    store.form.label().value.set('iPhone de Joan');
    register.mockResolvedValue('ok');

    expect(await store.register()).toBe(true);
    expect(store.submitting()).toBe(false);
  });

  it('should report neither outcome when the ceremony is dismissed', async () => {
    store.form.label().value.set('iPhone de Joan');
    register.mockResolvedValue('cancelled');

    expect(await store.register()).toBe(false);
    expect(store.unsupported()).toBe(false);
    expect(store.failed()).toBe(false);
  });

  it('should report an unsupported browser', async () => {
    store.form.label().value.set('iPhone de Joan');
    register.mockResolvedValue('unsupported');

    expect(await store.register()).toBe(false);
    expect(store.unsupported()).toBe(true);
  });

  it('should report a breakdown', async () => {
    store.form.label().value.set('iPhone de Joan');
    register.mockResolvedValue('failed');

    expect(await store.register()).toBe(false);
    expect(store.failed()).toBe(true);
  });

  it('should treat a refusal as a breakdown', async () => {
    store.form.label().value.set('iPhone de Joan');
    register.mockResolvedValue('refused');

    expect(await store.register()).toBe(false);
    expect(store.failed()).toBe(true);
  });

  it('should clear the previous outcome before trying again', async () => {
    store.form.label().value.set('iPhone de Joan');
    register.mockResolvedValueOnce('failed');
    await store.register();
    expect(store.failed()).toBe(true);

    register.mockResolvedValueOnce('ok');
    expect(await store.register()).toBe(true);
    expect(store.failed()).toBe(false);
  });
});
