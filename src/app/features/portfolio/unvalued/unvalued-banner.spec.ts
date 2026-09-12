import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { type RenderResult, render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { UnvaluedBanner } from './unvalued-banner';

const renderBanner = (count: number): Promise<RenderResult<UnvaluedBanner>> =>
  render(UnvaluedBanner, {
    inputs: { count },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([])],
  });

describe('UnvaluedBanner', () => {
  it('should render nothing when every holding is valued', async () => {
    const { container } = await renderBanner(0);

    expect(container).toBeEmptyDOMElement();
  });

  it('should announce the count as a status', async () => {
    await renderBanner(3);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should link to the sources screen', async () => {
    await renderBanner(3);

    expect(screen.getByRole('link', { name: 'portfolio.unvalued.action' })).toHaveAttribute('href', '/sources');
  });
});
