import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { TRANSLOCO_LOADER, provideTranslocoScope } from '@jsverse/transloco';
import { Subject, of, throwError } from 'rxjs';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { type ShowToast, injectErrorToast, injectToast } from './toast';

describe('injectToast', () => {
  const setup = (): ShowToast => {
    TestBed.configureTestingModule({
      imports: [
        getTranslocoTestingModule({
          langs: { en: { saved: 'Saved', imported: '{{count}} imported' } },
          preloadLangs: true,
        }),
      ],
      providers: [provideZonelessChangeDetection()],
    });

    return TestBed.runInInjectionContext(() => injectToast());
  };

  it('shows the translated message as the confirmation toast', () => {
    const toast = setup();

    toast('saved');

    expect(TestBed.inject(UiToasts).toast()).toMatchObject({ kind: 'success', text: 'Saved' });
  });

  it('passes the parameters to the translation', () => {
    const toast = setup();

    toast('imported', { count: 3 });

    expect(TestBed.inject(UiToasts).toast()?.text).toBe('3 imported');
  });

  it('waits for the scope of the key before translating it', () => {
    const scope = new Subject<Record<string, string>>();
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ preloadLangs: false })],
      providers: [
        provideZonelessChangeDetection(),
        provideTranslocoScope('profile'),
        {
          provide: TRANSLOCO_LOADER,
          useValue: { getTranslation: (path: string) => (path.includes('/') ? scope : of({})) },
        },
      ],
    });
    const toast = TestBed.runInInjectionContext(() => injectToast());

    toast('profile.toasts.saved');

    expect(TestBed.inject(UiToasts).toast()).toBeNull();

    scope.next({ 'toasts.saved': 'Saved' });
    scope.complete();

    expect(TestBed.inject(UiToasts).toast()?.text).toBe('Saved');
  });

  it('still shows the message, untranslated, when its scope fails to load', () => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ preloadLangs: false, translocoConfig: { failedRetries: 0 } })],
      providers: [
        provideZonelessChangeDetection(),
        provideTranslocoScope('profile'),
        {
          provide: TRANSLOCO_LOADER,
          useValue: {
            getTranslation: (path: string) => (path.includes('/') ? throwError(() => new Error('offline')) : of({})),
          },
        },
      ],
    });
    const toast = TestBed.runInInjectionContext(() => injectToast());

    toast('profile.toasts.saved');

    expect(TestBed.inject(UiToasts).toast()?.text).toMatch(/profile\.toasts\.saved$/);
  });
});

describe('injectErrorToast', () => {
  it('shows the translated message as an error toast closed by the shared close label', () => {
    TestBed.configureTestingModule({
      imports: [
        getTranslocoTestingModule({
          langs: { en: { failed: 'Import failed: {{reason}}', 'dialog.close': 'Close' } },
          preloadLangs: true,
        }),
      ],
      providers: [provideZonelessChangeDetection()],
    });
    const toast = TestBed.runInInjectionContext(() => injectErrorToast());

    toast('failed', { reason: 'missing column' });

    expect(TestBed.inject(UiToasts).toast()).toMatchObject({
      kind: 'error',
      text: 'Import failed: missing column',
      closeLabel: 'Close',
    });
  });
});
