import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideThemeInit } from './theme-init';

describe('provideThemeInit', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('cairn.theme');
  });

  it('should apply a stored preference on bootstrap, without any screen having injected ThemeStore itself', () => {
    localStorage.setItem('cairn.theme', 'dark');
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideThemeInit()] });

    TestBed.inject(ApplicationRef);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
