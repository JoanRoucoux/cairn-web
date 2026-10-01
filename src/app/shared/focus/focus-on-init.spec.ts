import { Component, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import { FocusOnInit } from './focus-on-init';

@Component({
  selector: 'app-test-host',
  imports: [FocusOnInit],
  template: '<h1 appFocusOnInit tabindex="-1">Title</h1>',
})
class TestHost {}

describe('FocusOnInit', () => {
  it('moves focus to its element once it has rendered', async () => {
    await render(TestHost, { providers: [provideZonelessChangeDetection()] });

    expect(await screen.findByRole('heading', { name: 'Title' })).toHaveFocus();
  });
});
