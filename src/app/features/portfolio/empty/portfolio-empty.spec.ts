import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioEmpty } from './portfolio-empty';

describe('PortfolioEmpty', () => {
  const renderComponent = (): ReturnType<typeof render> =>
    render(PortfolioEmpty, {
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

  it('should show the title and the description', async () => {
    await renderComponent();

    expect(await screen.findByText('portfolio.empty.title')).toBeInTheDocument();
    expect(screen.getByText('portfolio.empty.description')).toBeInTheDocument();
  });

  it('should link to holdings to add a first line', async () => {
    await renderComponent();

    expect(await screen.findByRole('link', { name: 'portfolio.empty.addHolding' })).toHaveAttribute(
      'href',
      '/holdings',
    );
  });

  it('should link to the profile to import a CSV', async () => {
    await renderComponent();

    expect(await screen.findByRole('link', { name: 'portfolio.empty.importCsv' })).toHaveAttribute('href', '/profile');
  });
});
