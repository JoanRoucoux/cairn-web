import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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
});
