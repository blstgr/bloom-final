/**
 * Sentence-cases a species name for display: "prayer plant" -> "Prayer plant",
 * "Monstera Deliciosa" -> "Monstera deliciosa".
 *
 * Every title in the app is sentence case (docs/search-spec.md §7), plant names included, and
 * Perenual returns `common_name` in whatever case its contributors typed. Only the first letter is
 * raised. A later word is lowercased unless it is entirely capitals, which marks an acronym rather
 * than title casing — so "ZZ plant" keeps its "ZZ" — or a proper noun from the list below, so
 * "Dwarf Japanese Maple" becomes "Dwarf Japanese maple", not "Dwarf japanese maple".
 */
export function toDisplaySpeciesName(name: string): string {
  const words = name.trim().split(/(\s+)/);

  return words
    .map((word, index) => {
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      if (isAcronym(word)) return word;
      const properNoun = PROPER_NOUNS.get(word.toLowerCase());
      if (properNoun) return properNoun;

      return word.toLowerCase();
    })
    .join('');
}

const MIN_ACRONYM_LENGTH = 2;

/**
 * Proper nouns that turn up after the first word of houseplant common names: nationalities,
 * places and the people plants are named after. Not exhaustive — a word missing here is lowercased
 * like any other, which reads as a typo rather than a wrong name. Keyed lowercase, valued as
 * written. Spec ruling: docs/search-spec.md §7.
 */
const PROPER_NOUNS = new Map(
  [
    'African', 'Algerian', 'American', 'Amazon', 'Amazonian', 'Arabian', 'Asian', 'Australian',
    'Boston', 'Brazilian', 'Burmese', 'Canary', 'Cape', 'Chinese', 'Christmas', 'Easter', 'English',
    'European', 'Hawaiian', 'Himalayan', 'Indian', 'Japanese', 'Javanese', 'Kentia', 'Korean',
    'Madagascar', 'Mexican', 'Moses', 'Norfolk', 'Persian', 'Peruvian', 'Swedish', 'Swiss', 'Thanksgiving',
    'Turkish', 'Venus',
  ].map(word => [word.toLowerCase(), word]),
);

function isAcronym(word: string): boolean {
  const letters = word.replace(/[^A-Za-z]/g, '');

  return letters.length >= MIN_ACRONYM_LENGTH && letters === letters.toUpperCase();
}
