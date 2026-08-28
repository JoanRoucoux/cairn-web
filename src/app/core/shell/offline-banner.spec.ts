import { provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { OfflineBanner } from './offline-banner';

const renderBanner = (): ReturnType<typeof render<OfflineBanner>> =>
  render(OfflineBanner, {
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection()],
  });

describe('OfflineBanner', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('should render nothing while the browser is online', async () => {
    const { container } = await renderBanner();

    expect(container).toBeEmptyDOMElement();
  });

  it('should warn while the browser is offline', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    await renderBanner();

    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
  });

  it('should warn when connectivity is lost', async () => {
    await renderBanner();

    window.dispatchEvent(new Event('offline'));

    expect(await screen.findByTestId('offline-banner')).toBeInTheDocument();
  });

  it('should clear the warning when connectivity returns', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await renderBanner();

    window.dispatchEvent(new Event('online'));

    await vi.waitFor(() => expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument());
  });

  it('should render nothing when there is no window, as in server-side rendering', async () => {
    vi.spyOn(document, 'defaultView', 'get').mockReturnValue(null);

    await renderBanner();

    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });
});
