import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideServiceWorkerRemoval } from './service-worker-removal';

describe('provideServiceWorkerRemoval', () => {
  const withServiceWorker = (container: unknown): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: { defaultView: { navigator: { serviceWorker: container } } } },
        provideServiceWorkerRemoval(),
      ],
    });
    TestBed.inject(DOCUMENT);
  };

  it('should unregister every worker a browser still holds', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    withServiceWorker({ getRegistrations: () => Promise.resolve([{ unregister }, { unregister }]) });

    await vi.waitFor(() => expect(unregister).toHaveBeenCalledTimes(2));
  });

  it('should do nothing where the browser supports no service worker at all', () => {
    expect(() => withServiceWorker(undefined)).not.toThrow();
  });
});
