import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  let loader: TranslocoHttpLoader;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    loader = TestBed.inject(TranslocoHttpLoader);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch the translation file of the requested language', async () => {
    const translation = firstValueFrom(loader.getTranslation('fr'));

    httpTesting.expectOne('/i18n/fr.json').flush({ 'pageTitle.portfolio': 'Portefeuille' });

    expect(await translation).toEqual({ 'pageTitle.portfolio': 'Portefeuille' });
  });

  it('should fetch a lazy scope with its scoped path', async () => {
    const translation = firstValueFrom(loader.getTranslation('holdings/en'));

    httpTesting.expectOne('/i18n/holdings/en.json').flush({ averageCost: 'Average cost' });

    expect(await translation).toEqual({ averageCost: 'Average cost' });
  });
});
