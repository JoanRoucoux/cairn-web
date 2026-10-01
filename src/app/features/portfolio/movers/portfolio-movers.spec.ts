import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import type { AsyncState } from '@joanroucoux/cairn-ui';
import { render, screen, within } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioMovers } from './portfolio-movers';

const movers = [
  {
    id: 'h1',
    instrumentName: 'Amundi MSCI World',
    accountName: 'PEA Boursorama',
    marketValueEur: 83277.6,
    dayChangeEur: 142.8,
    dayChangeRatio: 0.0017,
  },
] as unknown as HoldingResponse[];

const renderComponent = (state: AsyncState = 'ready', data = movers): ReturnType<typeof render> =>
  render(PortfolioMovers, {
    imports: [getTranslocoTestingModule()],
    inputs: { state, movers: data },
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'fr-FR' }],
  });

describe('PortfolioMovers', () => {
  it('should link each mover to its holding detail, in the list and in the table', async () => {
    await renderComponent();

    const list = within(await screen.findByTestId('movers-list'));
    const table = within(await screen.findByTestId('movers-table'));

    expect(list.getByRole('link', { name: /Amundi MSCI World/ })).toHaveAttribute('href', '/holdings/h1');
    expect(table.getByRole('link', { name: 'Amundi MSCI World' })).toHaveAttribute('href', '/holdings/h1');
  });

  it('should show the day change in percent, not in euros, under the value on the list', async () => {
    await renderComponent();

    const list = within(await screen.findByTestId('movers-list'));

    expect(list.getByText('+0,17 %', { exact: false })).toBeInTheDocument();
    expect(list.queryByText('142,80', { exact: false })).not.toBeInTheDocument();
  });

  it('should render the table headers', async () => {
    await renderComponent();

    const table = within(await screen.findByTestId('movers-table'));

    expect(table.getByText('portfolio.movers.columns.line')).toBeInTheDocument();
    expect(table.getByText('portfolio.movers.columns.account')).toBeInTheDocument();
    expect(table.getByText('portfolio.movers.columns.value')).toBeInTheDocument();
    expect(table.getByText('portfolio.movers.columns.day')).toBeInTheDocument();
    expect(table.getByText('portfolio.movers.columns.dayPercent')).toBeInTheDocument();
  });

  it('should show the empty message when nothing moved today', async () => {
    await renderComponent('empty', []);

    expect(await screen.findByText('portfolio.movers.empty')).toBeInTheDocument();
  });

  it('should show a skeleton while loading', async () => {
    await renderComponent('loading');

    expect(await screen.findByTestId('movers-loading')).toBeInTheDocument();
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
});
