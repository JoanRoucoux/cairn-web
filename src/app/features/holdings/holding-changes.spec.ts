import { TestBed } from '@angular/core/testing';

import { HoldingChanges } from './holding-changes';

describe('HoldingChanges', () => {
  let changes: HoldingChanges;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [HoldingChanges] });
    changes = TestBed.inject(HoldingChanges);
  });

  it('starts with nothing touched or removed', () => {
    expect(changes.lastTouched()).toBeNull();
    expect(changes.lastRemoved()).toBeNull();
  });

  it('records the touched id with a timestamp', () => {
    vi.useFakeTimers({ now: 1000 });
    changes.touched('a');

    expect(changes.lastTouched()).toEqual({ id: 'a', at: 1000 });
    expect(changes.lastRemoved()).toBeNull();
    vi.useRealTimers();
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
