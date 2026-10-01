import { TestBed } from '@angular/core/testing';

import { injectDesktop } from './desktop-media';

describe('injectDesktop', () => {
  const original = globalThis.matchMedia;

  afterEach(() => {
    globalThis.matchMedia = original;
  });

  it('should be false when matchMedia is unavailable', () => {
    globalThis.matchMedia = undefined as never;

    expect(TestBed.runInInjectionContext(() => injectDesktop())()).toBe(false);
  });

  it('should follow the 1024 px query and stop listening on destroy', () => {
    let listener: () => void = () => undefined;
    const query = {
      matches: true,
      addEventListener: vi.fn((_: string, fn: () => void) => (listener = fn)),
      removeEventListener: vi.fn(),
    };
    globalThis.matchMedia = vi.fn(() => query) as never;

    const desktop = TestBed.runInInjectionContext(() => injectDesktop());

    expect(desktop()).toBe(true);
    expect(globalThis.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');

    query.matches = false;
    listener();

    expect(desktop()).toBe(false);

    TestBed.resetTestingModule();

    expect(query.removeEventListener).toHaveBeenCalledWith('change', listener);
  });
});
