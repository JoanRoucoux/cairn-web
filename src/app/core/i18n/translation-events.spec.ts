import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { type TranslocoEvents, TranslocoService } from '@jsverse/transloco';
import { Subject, config } from 'rxjs';

import { injectTranslationEvents } from './translation-events';

const loaded = { type: 'translationLoadSuccess', wasFailure: false, payload: { scope: null, langName: 'fr' } };

describe('injectTranslationEvents', () => {
  let events$: Subject<TranslocoEvents>;
  const onUnhandledError = vi.fn();

  beforeEach(() => {
    events$ = new Subject<TranslocoEvents>();
    onUnhandledError.mockReset();
    config.onUnhandledError = onUnhandledError;
    TestBed.configureTestingModule({ providers: [{ provide: TranslocoService, useValue: { events$ } }] });
  });

  afterEach(() => {
    config.onUnhandledError = null;
  });

  it('should hand over a Transloco event after the code that emitted it, never during it', async () => {
    const events = TestBed.runInInjectionContext(() => injectTranslationEvents());

    events$.next(loaded as TranslocoEvents);

    expect(events()).toBeNull();
    await Promise.resolve();
    expect(events()).toBe(loaded);
  });

  describe('when a scope load emits while Angular renders', () => {
    const renderEmitting = (read: () => () => unknown): ComponentFixture<unknown> => {
      @Component({ template: '{{ label() }}{{ emit() }}' })
      class Host {
        readonly #events = read();
        protected readonly label = computed(() => (this.#events() ? 'loaded' : 'raw'));
        protected emit(): string {
          events$.next(loaded as TranslocoEvents);
          return '';
        }
      }
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      return fixture;
    };

    it('should report NG0600 with a bare toSignal on events$', async () => {
      renderEmitting(() => toSignal(inject(TranslocoService).events$, { initialValue: null }));
      await new Promise((resolve) => setTimeout(resolve));

      expect(onUnhandledError).toHaveBeenCalledWith(expect.objectContaining({ code: -600 }));
    });

    it('should render without error and recompute afterwards with the helper', async () => {
      const fixture = renderEmitting(() => injectTranslationEvents());

      expect(fixture.nativeElement.textContent).toBe('raw');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('loaded');
      expect(onUnhandledError).not.toHaveBeenCalled();
    });
  });
});
