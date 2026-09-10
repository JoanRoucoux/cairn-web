import { TestBed } from '@angular/core/testing';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { formMessages } from './form-messages';

describe('formMessages', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        getTranslocoTestingModule({
          langs: { en: { forms: { required: 'Required', maxLength: 'At most {{limit}}', min: 'At least {{floor}}' } } },
        }),
      ],
    });
  });

  it('translates the three validators this application uses', () => {
    TestBed.runInInjectionContext(() => {
      const messages = formMessages();

      expect(messages.required()).toBe('Required');
      expect(messages.maxLength(280)()).toBe('At most 280');
      expect(messages.min(0)()).toBe('At least 0');
    });
  });
});
