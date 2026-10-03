import { DOCUMENT, type EnvironmentProviders, inject, provideEnvironmentInitializer } from '@angular/core';

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
