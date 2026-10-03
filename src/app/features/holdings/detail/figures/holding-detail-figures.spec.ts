import { LOCALE_ID, provideZonelessChangeDetection, signal } from '@angular/core';

import { UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui/amount';
import { type RenderResult, render } from '@testing-library/angular';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingDetailFigures } from './holding-detail-figures';

const holding = {
  marketValueEur: 330,
  unrealizedGainEur: 63,
  unrealizedGainRatio: 0.2,
  dayChangeEur: 1,
  dayChangeRatio: 0.003,
} as HoldingResponse;

describe('HoldingDetailFigures', () => {
  const renderFigures = async (masked: boolean): Promise<RenderResult<HoldingDetailFigures>> =>
    render(HoldingDetailFigures, {
      imports: [getTranslocoTestingModule()],
      inputs: { holding },
      providers: [
        provideZonelessChangeDetection(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        { provide: UI_AMOUNT_MASKED, useValue: signal(masked) },
      ],
    });

  it('should separate the gain and the day change from their ratio while amounts are visible', async () => {
    const { container } = await renderFigures(false);

    expect(container).toHaveTextContent(/63\.00\s*·\s*\+20\.00%/);
    expect(container).toHaveTextContent(/1\.00\s*·\s*\+0\.30%/);
  });

  it('should drop the separators with the amounts when they are masked', async () => {
    const { container } = await renderFigures(true);

    expect(container).toHaveTextContent('+20.00%');
    expect(container).toHaveTextContent('+0.30%');
    expect(container).not.toHaveTextContent('·');
  });
});
