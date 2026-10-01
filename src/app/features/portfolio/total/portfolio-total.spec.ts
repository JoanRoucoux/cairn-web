import { LOCALE_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { PortfolioResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioTotal } from './portfolio-total';

const portfolio = {
  totalEur: 164294.28,
  dayChangeEur: 412.56,
  dayChangeRatio: 0.003,
  unrealizedGainEur: 21846.9,
  unrealizedGainRatio: 0.1534,
  staleCount: 0,
} as unknown as PortfolioResponse;

describe('PortfolioTotal', () => {
  const renderComponent = async (inputs: {
    state?: 'loading' | 'error' | 'empty' | 'ready';
    portfolio?: PortfolioResponse;
    masked?: boolean;
  }): Promise<void> => {
    await render(PortfolioTotal, {
      imports: [getTranslocoTestingModule()],
      inputs: { state: inputs.state ?? 'ready', portfolio: inputs.portfolio },
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: UI_AMOUNT_MASKED, useValue: signal(inputs.masked ?? false) },
      ],
    });
  };

  it('should show the total through ui-amount', async () => {
    await renderComponent({ portfolio });

    expect(await screen.findByText('164 294,28 €')).toBeInTheDocument();
  });

  it('should show the day change and its ratio together, with a separate label', async () => {
    await renderComponent({ portfolio });

    expect(await screen.findByText('+412,56 €', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('+0,30 %', { exact: false })).toBeInTheDocument();
  });

  it('should hide only the euro figure of the day change when amounts are masked', async () => {
    await renderComponent({ portfolio, masked: true });

    expect(screen.queryByText('+412,56 €', { exact: false })).not.toBeInTheDocument();
    expect(await screen.findByText('+0,30 %', { exact: false })).toBeInTheDocument();
  });

  it('should show the unrealized gain and its ratio', async () => {
    await renderComponent({ portfolio });

    expect(await screen.findByText('+21 846,90 €', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('+15,34 %', { exact: false })).toBeInTheDocument();
  });

  it('should link to the holdings only when staleCount is positive', async () => {
    await renderComponent({ portfolio: { ...portfolio, staleCount: 1 } });

    const link = await screen.findByTestId('stale-link');
    expect(link).toHaveAttribute('href', '/holdings');
  });

  it('should not link to stale holdings when staleCount is zero', async () => {
    await renderComponent({ portfolio });

    expect(screen.queryByTestId('stale-link')).not.toBeInTheDocument();
  });

  it('should show a skeleton while loading', async () => {
    await renderComponent({ state: 'loading' });

    expect(await screen.findByTestId('total-loading')).toBeInTheDocument();
  });

  it('should show an error with a working retry', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(PortfolioTotal, {
      imports: [getTranslocoTestingModule()],
      inputs: { state: 'error' },
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: UI_AMOUNT_MASKED, useValue: signal(false) },
      ],
    });
    const retried = vi.fn();
    fixture.componentInstance.retry.subscribe(retried);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'portfolio.error.retry' }));

    expect(retried).toHaveBeenCalledOnce();
  });
});
