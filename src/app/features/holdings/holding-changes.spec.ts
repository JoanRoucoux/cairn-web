import { TestBed } from '@angular/core/testing';

import { HoldingChanges } from './holding-changes';

describe('HoldingChanges', () => {
  let changes: HoldingChanges;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [HoldingChanges] });
    changes = TestBed.inject(HoldingChanges);
  });

  it('starts with nothing touched, removed or revealed', () => {
    expect(changes.lastTouched()).toBeNull();
    expect(changes.lastRemoved()).toBeNull();
    expect(changes.lastRevealed()).toBeNull();
  });

  it('hands back the touched change, and reveals it once asked', () => {
    const change = changes.touched('a');

    expect(change).toBe(changes.lastTouched());
    expect(changes.lastRevealed()).toBeNull();

    changes.reveal(change);

    expect(changes.lastRevealed()).toBe(change);
  });

  it('records the touched id with a timestamp', () => {
    vi.useFakeTimers({ now: 1000 });
    changes.touched('a');

    expect(changes.lastTouched()).toEqual({ id: 'a', at: 1000 });
    expect(changes.lastRemoved()).toBeNull();
    vi.useRealTimers();
  });

  it('records a balance edit under the id of its account, the id its balance row answers to', () => {
    const change = changes.balanceSet('a1');

    expect(change).toBe(changes.lastTouched());
    expect(change.id).toBe('a1');
  });

  it('records the removed id with a timestamp', () => {
    vi.useFakeTimers({ now: 2000 });
    changes.removed('b');

    expect(changes.lastRemoved()).toEqual({ id: 'b', at: 2000 });
    expect(changes.lastTouched()).toBeNull();
    vi.useRealTimers();
  });

  it('emits a new value when the same id is touched twice', () => {
    changes.touched('a');
    const first = changes.lastTouched();
    changes.touched('a');

    expect(changes.lastTouched()).not.toBe(first);
  });
});
