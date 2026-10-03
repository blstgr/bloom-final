import { toDisplaySpeciesName } from './speciesName';

describe('toDisplaySpeciesName', () => {
  it('raises the first letter of a lowercase API name', () => {
    expect(toDisplaySpeciesName('prayer plant')).toBe('Prayer plant');
  });

  it('lowers title-cased words after the first', () => {
    expect(toDisplaySpeciesName('Monstera Deliciosa')).toBe('Monstera deliciosa');
    expect(toDisplaySpeciesName('Swiss Cheese Plant')).toBe('Swiss cheese plant');
  });

  it('keeps an acronym', () => {
    expect(toDisplaySpeciesName('ZZ plant')).toBe('ZZ plant');
    expect(toDisplaySpeciesName('zz plant')).toBe('Zz plant');
  });

  it('keeps hyphenated and bracketed words lowercase', () => {
    expect(toDisplaySpeciesName('spider-plant (Variegated)')).toBe('Spider-plant (variegated)');
  });

  it('keeps a proper noun capitalised after the first word', () => {
    expect(toDisplaySpeciesName('Dwarf Japanese Maple')).toBe('Dwarf Japanese maple');
    expect(toDisplaySpeciesName('norfolk island pine')).toBe('Norfolk island pine');
    expect(toDisplaySpeciesName('false african violet')).toBe('False African violet');
  });

  it('trims surrounding whitespace', () => {
    expect(toDisplaySpeciesName('  peace lily ')).toBe('Peace lily');
  });
});
