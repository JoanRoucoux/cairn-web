import { TestBed } from '@angular/core/testing';

import { AmountVisibility } from './amount-visibility';

describe('AmountVisibility', () => {
  beforeEach(() => localStorage.clear());

  it('shows amounts by default', () => {
    expect(TestBed.inject(AmountVisibility).hidden()).toBe(false);
  });

  it('remembers the choice across instances', () => {
    TestBed.inject(AmountVisibility).setHidden(true);

    expect(localStorage.getItem('cairn-hide-amounts')).toBe('1');
    TestBed.resetTestingModule();
    expect(TestBed.inject(AmountVisibility).hidden()).toBe(true);
  });

  it('remembers a choice to show amounts again', () => {
    TestBed.inject(AmountVisibility).setHidden(false);

    expect(localStorage.getItem('cairn-hide-amounts')).toBe('0');
  });

  it('keeps working in memory when storage throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const visibility = TestBed.inject(AmountVisibility);

    visibility.setHidden(true);

    expect(visibility.hidden()).toBe(true);
  });

  it('falls back to visible when storage throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    expect(TestBed.inject(AmountVisibility).hidden()).toBe(false);
  });
});
