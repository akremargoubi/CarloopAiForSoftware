import { describe, expect, it } from 'vitest';
import { anonymize, anonymizeText } from '../anonymizer.js';

describe('anonymizer', () => {
  it('masks emails', () => {
    expect(anonymizeText('Contactez moi à sami.benali@gmail.com svp')).toBe('Contactez moi à [EMAIL] svp');
  });

  it.each([
    ['+216 98 765 432'],
    ['0021698765432'],
    ['98765432'],
    ['98.765.432'],
    ['71 123 456'],
    ['+21625123456'],
    ['22 33 44 55'],
  ])('masks the Tunisian phone number %s', (phone) => {
    expect(anonymizeText(`Mon numéro : ${phone}.`)).toBe('Mon numéro : [TELEPHONE].');
  });

  it.each([['123 TU 4567'], ['123TU4567'], ['45-TN-123'], ['210 تونس 8899'], ['RS 123456'], ['12 tu 1']])(
    'masks the Tunisian plate %s',
    (plate) => {
      expect(anonymizeText(`Ma voiture ${plate} fait du bruit`)).toBe('Ma voiture [PLAQUE] fait du bruit');
    },
  );

  it('does not mask years, mileage or prices', () => {
    const text = 'Clio 4 de 2017, 125 000 km, 120000 km au compteur, budget 150 TND, code P0420';
    expect(anonymizeText(text)).toBe(text);
  });

  it('masks precise addresses but keeps ordinary sentences', () => {
    expect(anonymizeText('J’habite au 12 rue de Marseille, Tunis')).toBe('J’habite au [ADRESSE], Tunis');
    expect(anonymizeText('Avenue Habib Bourguiba')).toBe('[ADRESSE]');
    expect(anonymizeText('le bruit apparaît dans la rue quand je freine')).toBe(
      'le bruit apparaît dans la rue quand je freine',
    );
  });

  it('masks known user names, full or partial, case-insensitively', () => {
    const result = anonymize('Bonjour, je suis Sami Ben Ali. sami a une Polo. Le garage Benali ?', {
      knownNames: ['Sami Ben Ali'],
    });
    expect(result.text).toBe('Bonjour, je suis [NOM]. [NOM] a une Polo. Le garage Benali ?');
    expect(result.counts.name).toBe(2);
  });

  it('does not mask short parts or common particles on their own', () => {
    expect(anonymizeText('Ben a dit le moteur chauffe', { knownNames: ['Ali Ben Salah', 'Jo'] })).toBe(
      'Ben a dit le moteur chauffe',
    );
  });

  it('counts every kind of masked item', () => {
    const { counts } = anonymize('a@b.tn 98765432 123 TU 4567 rue Ibn Khaldoun', {});
    expect(counts).toEqual({ email: 1, phone: 1, plate: 1, address: 1, name: 0 });
  });
});
