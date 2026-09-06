import { DOCUMENT, type EnvironmentProviders, inject, provideEnvironmentInitializer } from '@angular/core';

/**
 * Removes the service worker this application used to register.
 *
 * Dropping `provideServiceWorker` only stops new registrations. It does nothing about the worker
 * already installed in a browser, which keeps answering navigations from its own cache until
 * something explicitly unregisters it — which is how a stale worker served the application's shell
 * for Spring Security's sign-in page and looped the browser between the two.
 *
 * Delete this once no browser can still be holding one.
 */
export function provideServiceWorkerRemoval(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const container = inject(DOCUMENT).defaultView?.navigator?.serviceWorker;

    void container?.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    });
  });
}
