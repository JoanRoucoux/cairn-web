import { provideZonelessChangeDetection } from '@angular/core';

import { render } from '@testing-library/angular';

import { CairnMark } from './cairn-mark';

describe('CairnMark', () => {
  it('renders the symbol at the requested size', async () => {
    const { container } = await render(CairnMark, {
      providers: [provideZonelessChangeDetection()],
      inputs: { size: 72 },
    });

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '72');
    expect(svg).toHaveAttribute('height', '72');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
