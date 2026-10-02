import { signal } from '@angular/core';

import { UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui';
import { type RenderResult, render } from '@testing-library/angular';

import { AmountSeparator } from './amount-separator';

describe('AmountSeparator', () => {
  const renderSeparator = async (masked: boolean): Promise<RenderResult<AmountSeparator>> =>
    render(AmountSeparator, { providers: [{ provide: UI_AMOUNT_MASKED, useValue: signal(masked) }] });

  it('should print the middle dot while amounts are visible', async () => {
    const { container } = await renderSeparator(false);

    expect(container).toHaveTextContent('·');
  });

  it('should print nothing while amounts are masked', async () => {
    const { container } = await renderSeparator(true);

    expect(container).not.toHaveTextContent('·');
  });
});
