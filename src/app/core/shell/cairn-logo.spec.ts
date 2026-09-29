import { provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import { CairnLogo } from './cairn-logo';

describe('CairnLogo', () => {
  it('renders the wordmark next to the symbol', async () => {
    await render(CairnLogo, { providers: [provideZonelessChangeDetection()] });

    expect(screen.getByText('Cairn')).toBeInTheDocument();
  });
});
