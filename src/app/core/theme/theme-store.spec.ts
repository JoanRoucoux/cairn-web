import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { vi } from 'vitest';

import { ThemeStore } from './theme-store';

describe('ThemeStore', () => {
  let root: HTMLElement;

  const configure = (stored: string | null): ThemeStore => {
    root = document.createElement('html');
    localStorage.clear();
    if (stored !== null) {
      localStorage.setItem('cairn.theme', stored);
    }
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { documentElement: root, defaultView: window } }],
    });

    return TestBed.inject(ThemeStore);
  };

  it('should start on the system preference when nothing is stored', () => {
    const store = configure(null);

    expect(store.preference()).toBe('system');
  });

  it('should leave data-theme unset for the system preference, so the OS decides', () => {
    configure(null);

    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('should restore a stored preference', () => {
    const store = configure('dark');

    expect(store.preference()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('should ignore a stored value that is not a preference', () => {
    const store = configure('neon');

    expect(store.preference()).toBe('system');
  });

  it('should stamp the root element when a scheme is chosen', () => {
    const store = configure(null);

    store.set('light');

    expect(root.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('cairn.theme')).toBe('light');
  });

  it('should remove the stamp when going back to the system preference', () => {
    const store = configure('dark');

    store.set('system');

    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  describe('switching without transitions', () => {
    let frame: FrameRequestCallback | undefined;

    beforeEach(() => {
      frame = undefined;
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frame = callback;
        return 1;
      });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('should hold data-theme-switching while the theme changes and release it on the next frame', () => {
      const store = configure(null);

      store.set('dark');

      expect(root.getAttribute('data-theme')).toBe('dark');
      expect(root.hasAttribute('data-theme-switching')).toBe(true);

      frame?.(0);

      expect(root.hasAttribute('data-theme-switching')).toBe(false);
    });

    it('should flush layout while the attribute is set, so no transition is computed without it', () => {
      const store = configure(null);
      const seen: boolean[] = [];
      vi.spyOn(root, 'getBoundingClientRect').mockImplementation(() => {
        seen.push(root.hasAttribute('data-theme-switching') && root.getAttribute('data-theme') === 'dark');

        return new DOMRect();
      });

      store.set('dark');

      expect(seen).toEqual([true]);
    });

    it('should not hold it when the store starts', () => {
      configure('dark');

      expect(root.hasAttribute('data-theme-switching')).toBe(false);
      expect(frame).toBeUndefined();
    });
  });

  describe('device scheme', () => {
    let listener: ((event: { matches: boolean }) => void) | undefined;

    const withDevice = (dark: boolean): ThemeStore => {
      const defaultView = {
        matchMedia: () => ({
          matches: dark,
          addEventListener: (_: string, callback: typeof listener) => (listener = callback),
        }),
      };
      root = document.createElement('html');
      localStorage.clear();
      TestBed.configureTestingModule({
        providers: [{ provide: DOCUMENT, useValue: { documentElement: root, defaultView } }],
      });

      return TestBed.inject(ThemeStore);
    };

    it('should read the device scheme', () => {
      expect(withDevice(true).systemScheme()).toBe('dark');
    });

    it('should follow the device when it switches', () => {
      const store = withDevice(false);

      listener?.({ matches: true });

      expect(store.systemScheme()).toBe('dark');
    });

    it('should assume light where the browser cannot tell', () => {
      expect(configure(null).systemScheme()).toBe('light');
    });
  });
});
