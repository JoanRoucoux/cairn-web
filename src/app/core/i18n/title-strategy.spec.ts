import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';

import { TranslocoService } from '@jsverse/transloco';
import { vi } from 'vitest';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AppTitleStrategy } from './title-strategy';

describe('AppTitleStrategy', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        getTranslocoTestingModule({
          langs: { en: { 'pageTitle.portfolio': 'Portfolio' }, fr: { 'pageTitle.portfolio': 'Portefeuille' } },
        }),
      ],
      providers: [provideZonelessChangeDetection()],
    });
  });

  const mockSnapshotWithTitle = (strategy: AppTitleStrategy, title: string | undefined): RouterStateSnapshot => {
    vi.spyOn(strategy, 'buildTitle').mockReturnValue(title);
    return {} as RouterStateSnapshot;
  };

  it('should translate the route title and append the app name', () => {
    const strategy = TestBed.inject(AppTitleStrategy);
    const titleService = TestBed.inject(Title);

    strategy.updateTitle(mockSnapshotWithTitle(strategy, 'pageTitle.portfolio'));

    expect(titleService.getTitle()).toBe('Portfolio | Cairn');
  });

  it('should fall back to the app name when the route has no title', () => {
    const strategy = TestBed.inject(AppTitleStrategy);
    const titleService = TestBed.inject(Title);

    strategy.updateTitle(mockSnapshotWithTitle(strategy, undefined));

    expect(titleService.getTitle()).toBe('Cairn');
  });

  it('should expose the page title for the route announcer', () => {
    const strategy = TestBed.inject(AppTitleStrategy);

    strategy.updateTitle(mockSnapshotWithTitle(strategy, 'pageTitle.portfolio'));
    expect(strategy.pageTitle()).toBe('Portfolio');

    strategy.updateTitle(mockSnapshotWithTitle(strategy, undefined));
    expect(strategy.pageTitle()).toBe('');
  });

  it('should re-translate the current title when the active language changes', () => {
    const strategy = TestBed.inject(AppTitleStrategy);
    const titleService = TestBed.inject(Title);
    const translocoService = TestBed.inject(TranslocoService);

    strategy.updateTitle(mockSnapshotWithTitle(strategy, 'pageTitle.portfolio'));
    translocoService.setActiveLang('fr');
    TestBed.tick();

    expect(titleService.getTitle()).toBe('Portefeuille | Cairn');
  });

  it('should leave the title untouched when the language changes before any navigation', () => {
    TestBed.inject(AppTitleStrategy);
    const setTitleSpy = vi.spyOn(TestBed.inject(Title), 'setTitle');

    TestBed.inject(TranslocoService).setActiveLang('fr');
    TestBed.tick();

    expect(setTitleSpy).not.toHaveBeenCalled();
  });
});
