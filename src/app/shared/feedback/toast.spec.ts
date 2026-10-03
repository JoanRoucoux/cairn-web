import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UiToasts } from '@joanroucoux/cairn-ui';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { injectToast } from './toast';

describe('injectToast', () => {
  const setup = (): ((key: string, params?: Record<string, unknown>) => void) => {
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

    expect(TestBed.inject(UiToasts).toast()?.text).toBe('Saved');
  });

  it('passes the parameters to the translation', () => {
    const toast = setup();

    toast('imported', { count: 3 });

    expect(TestBed.inject(UiToasts).toast()?.text).toBe('3 imported');
  });
});
