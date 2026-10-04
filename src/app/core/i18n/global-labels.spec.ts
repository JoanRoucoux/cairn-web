import en from '../../../../public/i18n/en.json';
import fr from '../../../../public/i18n/fr.json';

describe('global labels', () => {
  it('should call the portfolio page Portefeuille in the navigation and the page title', () => {
    expect(fr.shell.portfolio).toBe('Portefeuille');
    expect(fr.pageTitle.portfolio).toBe('Portefeuille');
  });

  it('should label the CTO envelope CTO in both languages', () => {
    expect(fr.enums.accountType.CTO).toBe('CTO');
    expect(en.enums.accountType.CTO).toBe('CTO');
  });

  it('should name the asset classes as the design does', () => {
    expect(fr.enums.assetClass).toEqual({
      EQUITY: 'Actions',
      ETF: 'ETF',
      FUND: 'Fonds',
      CRYPTO: 'Crypto',
      BOND: 'Obligations',
      OTHER: 'Autre',
      CASH: 'Liquidités',
    });
    expect(en.enums.assetClass.ETF).toBe('ETF');
    expect(en.enums.assetClass.BOND).toBe('Bonds');
    expect(en.enums.assetClass.OTHER).toBe('Other');
  });
});
