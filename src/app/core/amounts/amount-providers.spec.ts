import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UI_AMOUNT_LABELS, UI_AMOUNT_MASKED } from '@joanroucoux/cairn-ui/amount';
import { TranslocoService } from '@jsverse/transloco';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AmountVisibility, provideAmountVisibility } from './amount-visibility';

describe('amount providers', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        getTranslocoTestingModule({
          langs: {
            en: { amount: { masked: 'Hidden amount', missing: 'Not available' } },
            fr: { amount: { masked: 'Montant masqué', missing: 'Non renseigné' } },
          },
        }),
      ],
      providers: [provideZonelessChangeDetection(), provideAmountVisibility()],
    });
  });

  it('masks amounts as the visibility store says', () => {
    localStorage.clear();
    const masked = TestBed.inject(UI_AMOUNT_MASKED);

    expect(masked()).toBe(false);
    TestBed.inject(AmountVisibility).setHidden(true);
    expect(masked()).toBe(true);
    localStorage.clear();
  });

  it('speaks English by default', () => {
    expect(TestBed.inject(UI_AMOUNT_LABELS)()).toEqual({ masked: 'Hidden amount', missing: 'Not available' });
  });

  it('follows the active language', () => {
    const labels = TestBed.inject(UI_AMOUNT_LABELS);
    const transloco = TestBed.inject(TranslocoService);

    transloco.setActiveLang('fr');
    TestBed.tick();
    expect(labels()).toEqual({ masked: 'Montant masqué', missing: 'Non renseigné' });

    transloco.setActiveLang('en');
    TestBed.tick();
    expect(labels()).toEqual({ masked: 'Hidden amount', missing: 'Not available' });
  });
});
