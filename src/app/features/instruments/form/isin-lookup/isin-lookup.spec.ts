import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { IsinLookup } from './isin-lookup';

const candidates = [
  { sourceRef: 'ESE.PA', name: 'BNP Paribas Easy S&P 500', source: 'YAHOO', probePrice: 33.3069 },
  { sourceRef: 'ESE.MI', name: 'BNP Paribas Easy S&P 500', source: 'YAHOO', probePrice: 33.29 },
] as unknown as InstrumentCandidateResponse[];

const renderLookup = (
  props: Partial<{ candidates: InstrumentCandidateResponse[]; searching: boolean; notFound: boolean }> = {},
): ReturnType<typeof render<IsinLookup>> =>
  render(IsinLookup, {
    inputs: { candidates: [], searching: false, notFound: false, ...props },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('IsinLookup', () => {
  it('should ask for an ISIN', async () => {
    await renderLookup();

    expect(screen.getByRole('searchbox', { name: 'instruments.lookup.label' })).toBeInTheDocument();
  });

  it('should emit the typed ISIN on submit', async () => {
    const user = userEvent.setup();
    const searched = vi.fn();
    const { fixture } = await renderLookup();
    fixture.componentInstance.searched.subscribe(searched);

    await user.type(screen.getByRole('searchbox', { name: 'instruments.lookup.label' }), 'FR0011550185');
    await user.click(screen.getByRole('button', { name: 'instruments.lookup.search' }));

    expect(searched).toHaveBeenCalledWith('FR0011550185');
  });

  it('should show each candidate with its probe price', async () => {
    await renderLookup({ candidates });

    expect(await screen.findAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('€33.31')).toBeInTheDocument();
  });

  it('should offer manual entry when nothing resolves', async () => {
    await renderLookup({ notFound: true });

    expect(await screen.findByText('instruments.lookup.notFound')).toBeInTheDocument();
  });

  it('should announce that a search is running', async () => {
    await renderLookup({ searching: true });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should emit the picked candidate', async () => {
    const user = userEvent.setup();
    const picked = vi.fn();
    const { fixture } = await renderLookup({ candidates });
    fixture.componentInstance.picked.subscribe(picked);

    const candidateButtons = await screen.findAllByTestId('isin-candidate');
    await user.click(candidateButtons[0] as HTMLElement);

    expect(picked).toHaveBeenCalledWith(candidates[0]);
  });

  it('should not emit a blank search', async () => {
    const user = userEvent.setup();
    const searched = vi.fn();
    const { fixture } = await renderLookup();
    fixture.componentInstance.searched.subscribe(searched);

    await user.click(screen.getByRole('button', { name: 'instruments.lookup.search' }));

    expect(searched).not.toHaveBeenCalled();
  });

  it('says what it is waiting for instead of ignoring an empty search', async () => {
    const user = userEvent.setup();
    const searched = vi.fn();
    const { fixture } = await renderLookup();
    fixture.componentInstance.searched.subscribe(searched);

    await user.click(screen.getByTestId('isin-search'));

    expect(searched).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('instruments.lookup.blank');
  });

  it('clears the complaint as soon as the reader types', async () => {
    const user = userEvent.setup();
    await renderLookup();

    await user.click(screen.getByTestId('isin-search'));
    await user.type(screen.getByTestId('isin-input'), 'FR001');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
