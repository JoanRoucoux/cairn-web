import { provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { type MotionRecord, recordMotion } from '@shared/testing/motion';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { PasskeyView } from '../profile-store';
import { ProfilePasskeyList } from './profile-passkey-list';

const TRANSLATIONS = {
  'profile.created': 'Créée le {{date}}',
  'profile.lastUsed.today': "Utilisée aujourd'hui",
  'profile.lastUsed.yesterday': 'Utilisée hier',
  'profile.lastUsed.on': 'Utilisée le {{date}}',
  'profile.lastUsed.never': 'Jamais utilisée',
  'profile.provider.ICLOUD_KEYCHAIN': 'iCloud',
  'profile.provider.SECURITY_KEY': 'Clé de sécurité',
};

const view = (overrides: Partial<PasskeyView>): PasskeyView => ({
  credentialId: 'id',
  label: 'Clé',
  current: false,
  provider: null,
  created: '12/03/2025',
  usage: { kind: 'never', date: '' },
  ...overrides,
});

const passkeys: PasskeyView[] = [
  view({
    credentialId: 'a',
    label: 'iPhone de Joan',
    current: true,
    provider: 'ICLOUD_KEYCHAIN',
    usage: { kind: 'today', date: '' },
  }),
  view({ credentialId: 'b', label: 'MacBook Air', usage: { kind: 'yesterday', date: '' } }),
  view({
    credentialId: 'c',
    label: 'YubiKey 5C',
    created: '04/11/2025',
    provider: 'SECURITY_KEY',
    usage: { kind: 'on', date: '02/09/2026' },
  }),
  view({ credentialId: 'd', label: 'Neuve' }),
];

describe('ProfilePasskeyList', () => {
  const add = vi.fn();
  const remove = vi.fn();
  const retry = vi.fn();

  const renderList = (
    inputs: { state: 'loading' | 'error' | 'ready'; passkeys: PasskeyView[]; added?: ReadonlySet<string> } = {
      state: 'ready',
      passkeys,
    },
  ): ReturnType<typeof render<ProfilePasskeyList>> =>
    render(ProfilePasskeyList, {
      inputs,
      on: { add, remove, retry },
      imports: [getTranslocoTestingModule({ langs: { en: TRANSLATIONS } })],
      providers: [provideZonelessChangeDetection()],
    });

  afterEach(() => {
    add.mockClear();
    remove.mockClear();
    retry.mockClear();
  });

  it('should list every key with a delete button on each', async () => {
    await renderList();

    expect(screen.getAllByTestId('revoke-passkey')).toHaveLength(4);
  });

  it('should badge the key that opened this session, and only that one', async () => {
    await renderList();

    const badges = screen.getAllByTestId('current-passkey');

    expect(badges).toHaveLength(1);
    expect(badges[0]!.closest('li')).toHaveTextContent('iPhone de Joan');
  });

  it('should describe each key with its provider, creation date and last use, omitting an unknown provider', async () => {
    await renderList();

    expect(screen.getAllByTestId('passkey-meta').map((meta) => meta.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      "iCloud · Créée le 12/03/2025 · Utilisée aujourd'hui",
      'Créée le 12/03/2025 · Utilisée hier',
      'Clé de sécurité · Créée le 04/11/2025 · Utilisée le 02/09/2026',
      'Créée le 12/03/2025 · Jamais utilisée',
    ]);
  });

  it('should hand the key to delete to its parent', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.click(screen.getAllByTestId('revoke-passkey')[1]!);

    expect(remove).toHaveBeenCalledWith(passkeys[1]);
  });

  it('should ask to add a key', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.click(screen.getByTestId('manage-passkeys'));

    expect(add).toHaveBeenCalled();
  });

  it('should hide the delete button of the only key and explain why', async () => {
    await renderList({ state: 'ready', passkeys: [passkeys[0]!] });

    expect(screen.queryByTestId('revoke-passkey')).not.toBeInTheDocument();
    expect(screen.getByText('profile.onlyKey')).toBeInTheDocument();
  });

  it('should show placeholders while loading', async () => {
    await renderList({ state: 'loading', passkeys: [] });

    expect(screen.queryByTestId('revoke-passkey')).not.toBeInTheDocument();
    await vi.waitFor(() => expect(document.querySelectorAll('ui-skeleton').length).toBeGreaterThan(0));
  });

  describe('after a change', () => {
    let motion: MotionRecord;

    beforeEach(() => (motion = recordMotion()));

    afterEach(() => motion.restore());

    it('should highlight the key just added, and only that one', async () => {
      await renderList({ state: 'ready', passkeys, added: new Set(['c']) });

      await vi.waitFor(() => expect(motion.highlighted).toHaveLength(1));
      expect(motion.highlighted[0]).toHaveTextContent('YubiKey 5C');
      expect(motion.highlighted[0]!.tagName).toBe('LI');
    });

    it('should highlight nothing when no key was just added', async () => {
      await renderList();

      expect(screen.getAllByRole('listitem')).toHaveLength(4);
      expect(motion.highlighted).toEqual([]);
    });
  });

  it('should offer a retry when the keys could not be loaded', async () => {
    const user = userEvent.setup();
    await renderList({ state: 'error', passkeys: [] });

    await user.click(screen.getByRole('button', { name: 'profile.retry' }));

    expect(retry).toHaveBeenCalled();
  });
});
