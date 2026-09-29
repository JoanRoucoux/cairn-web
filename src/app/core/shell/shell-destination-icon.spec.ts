import { provideZonelessChangeDetection } from '@angular/core';

import { render } from '@testing-library/angular';

import { ShellDestinationIcon } from './shell-destination-icon';
import { SHELL_ICONS } from './shell-nav';

describe('ShellDestinationIcon', () => {
  it.each(SHELL_ICONS)('renders an icon for %s', async (icon) => {
    const { container } = await render(ShellDestinationIcon, {
      inputs: { icon, size: 18 },
      providers: [provideZonelessChangeDetection()],
    });

    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
