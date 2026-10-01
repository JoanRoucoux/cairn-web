import { provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingDetailDescription } from './holding-detail-description';

const renderDescription = (externalUrl: string | null): ReturnType<typeof render> =>
  render(HoldingDetailDescription, {
    inputs: { description: 'An ETF.', externalUrl },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection()],
  });

describe('HoldingDetailDescription', () => {
  it('links to the factsheet in a new tab', async () => {
    await renderDescription('https://www.amundietf.fr/fr/x');

    const link = await screen.findByRole('link');

    expect(link).toHaveAttribute('href', 'https://www.amundietf.fr/fr/x');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows only the description when there is no link, or an unreadable one', async () => {
    await renderDescription('not a url');

    expect(await screen.findByText('An ETF.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
