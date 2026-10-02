import { provideZonelessChangeDetection } from '@angular/core';

import type { AsyncState } from '@joanroucoux/cairn-ui';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingDetailMissing } from './holding-detail-missing';

describe('HoldingDetailMissing', () => {
  const renderMissing = (state: AsyncState): ReturnType<typeof render<HoldingDetailMissing>> =>
    render(HoldingDetailMissing, {
      inputs: { state },
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), provideTranslocoScope('holdings')],
    });

  it('shows the placeholders and the loading status only after 150 ms', async () => {
    await renderMissing('loading');

    expect(document.querySelector('ui-skeleton')).toBeNull();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    expect(await screen.findByRole('status')).toHaveTextContent('holdings.loading');
    expect(document.querySelectorAll('ui-skeleton')).toHaveLength(2);
  });

  it('says the load failed', async () => {
    await renderMissing('error');

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.error');
  });

  it('says the line is not found once nothing is loading', async () => {
    await renderMissing('empty');

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.notFound');
  });
});
