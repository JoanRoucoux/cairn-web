import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { DecimalInput } from './decimal-input';

@Component({
  selector: 'app-test-host',
  imports: [DecimalInput, FormField],
  template: '<input appDecimalInput aria-label="amount" [formField]="draft.amount" />',
})
class TestHost {
  readonly model = signal({ amount: '' });
  readonly draft = form(this.model);
}

describe('DecimalInput', () => {
  it('keeps digits, separators and spaces, and drops every other keystroke from the field and its model', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(TestHost);

    await user.type(screen.getByLabelText('amount'), '-1a 2,5e.');

    expect(screen.getByLabelText('amount')).toHaveValue('1 2,5.');
    expect(fixture.componentInstance.model().amount).toBe('1 2,5.');
  });
});
