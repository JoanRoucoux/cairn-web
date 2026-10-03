import { LOCALE_ID, provideZonelessChangeDetection, signal } from '@angular/core';

import { UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui/amount';
import { type AsyncState } from '@joanroucoux/cairn-ui/async';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { EnvelopePerformanceResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioEnvelopes } from './portfolio-envelopes';

const envelopes: EnvelopePerformanceResponse[] = [
  { accountType: 'PEA', valueEur: 88200, share: 0.373, changeEur: 210, changeRatio: 0.0024 },
  { accountType: 'PEE', valueEur: 107700, share: 0.455, changeEur: 190, changeRatio: 0.0018 },
];

const renderComponent = (state: AsyncState = 'ready', data = envelopes, masked = false): ReturnType<typeof render> =>
  render(PortfolioEnvelopes, {
    imports: [getTranslocoTestingModule()],
    inputs: { state, envelopes: data, range: '1m' },
    providers: [
      provideZonelessChangeDetection(),
      { provide: LOCALE_ID, useValue: 'fr-FR' },
      { provide: UI_AMOUNT_MASKED, useValue: signal(masked) },
    ],
  });

describe('PortfolioEnvelopes', () => {
  it('should show one row per envelope with its name, value and share', async () => {
    await renderComponent();

    expect(await screen.findByText('enums.accountType.PEA')).toBeInTheDocument();
    expect(screen.getByText('37,3 %', { exact: false })).toBeInTheDocument();
  });

  it('should show only the percent change below lg, and the amount with the percent from lg', async () => {
    await renderComponent();

    const [percentOnly] = await screen.findAllByTestId('envelope-change-percent');
    const [full] = await screen.findAllByTestId('envelope-change-full');

    expect(percentOnly).toHaveTextContent('+0,24 %');
    expect(percentOnly).not.toHaveTextContent('€');
    expect(full).toHaveTextContent('+210,00 €');
    expect(full).toHaveTextContent('+0,24 %');
  });

  it('should hide the amount and drop the separator when amounts are masked', async () => {
    await renderComponent('ready', envelopes, true);

    const [full] = await screen.findAllByTestId('envelope-change-full');

    expect(full?.querySelector('ui-amount')).toHaveAttribute('hidden');
    expect(full).not.toHaveTextContent('·');
  });

  it('should size the bar to the envelope share', async () => {
    await renderComponent();

    const [bar] = await screen.findAllByTestId('meter-fill');
    expect((bar as HTMLElement).style.width).toBe('37.3%');
  });

  it('should show a skeleton while loading', async () => {
    await renderComponent('loading');

    expect(await screen.findByTestId('envelopes-loading')).toBeInTheDocument();
  });

  it('should show an error with a working retry', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderComponent('error');
    const retried = vi.fn();
    fixture.componentInstance.retry.subscribe(retried);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'portfolio.error.retry' }));

    expect(retried).toHaveBeenCalledOnce();
  });

  it('should show the empty message when there is no envelope', async () => {
    await renderComponent('empty', []);

    expect(await screen.findByText('portfolio.envelopes.empty')).toBeInTheDocument();
  });
});
