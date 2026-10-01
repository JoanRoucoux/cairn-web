import { focusInitial } from './focus-initial';

describe('focusInitial', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    host.innerHTML = '<button data-testid="x-cancel" type="button">Cancel</button><input data-testid="x-field" />';
    document.body.append(host);
  });

  afterEach(() => host.remove());

  it('focuses the Cancel button when it can take focus', () => {
    focusInitial(host, 'x-cancel', 'x-field');

    expect(document.activeElement).toBe(host.querySelector('[data-testid="x-cancel"]'));
  });

  it('falls back on the field when Cancel cannot take focus, as on a sheet where it is hidden', () => {
    host.querySelector<HTMLElement>('[data-testid="x-cancel"]')!.focus = () => undefined;

    focusInitial(host, 'x-cancel', 'x-field');

    expect(document.activeElement).toBe(host.querySelector('[data-testid="x-field"]'));
  });

  it('falls back on the field when there is no Cancel button', () => {
    host.querySelector('[data-testid="x-cancel"]')!.remove();

    focusInitial(host, 'x-cancel', 'x-field');

    expect(document.activeElement).toBe(host.querySelector('[data-testid="x-field"]'));
  });
});
