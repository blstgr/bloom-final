import { getSpeciesById } from './catalog';
import { mockSpecies } from './mockPlants';
import { availableFilters, matchesFilter, PLANT_FILTERS } from './plantFilters';
import { rankPopularPlants } from './popularPlantRanking';
import { POPULAR_PLANTS } from './popularPlants';
import type { PlantSpecies } from './types';

const base = mockSpecies[0];

function species(overrides: Partial<PlantSpecies>): PlantSpecies {
  return { ...base, ...overrides };
}

describe('matchesFilter', () => {
  it('matches every plant under All', () => {
    expect(matchesFilter(species({}), 'all')).toBe(true);
  });

  it('reads Unkillable and Moody from the two ends of the watering scale', () => {
    expect(matchesFilter(species({ wateringIntervalDays: 21 }), 'unkillable')).toBe(true);
    expect(matchesFilter(species({ wateringIntervalDays: 10 }), 'unkillable')).toBe(false);
    expect(matchesFilter(species({ wateringIntervalDays: 5 }), 'moody')).toBe(true);
    expect(matchesFilter(species({ wateringIntervalDays: 10 }), 'moody')).toBe(false);
  });

  it('reads Pet-safe from toxicity', () => {
    expect(matchesFilter(species({ isToxicToPets: false }), 'pet-safe')).toBe(true);
    expect(matchesFilter(species({ isToxicToPets: true }), 'pet-safe')).toBe(false);
  });

  it('reads Sunbathers and Shady from the light need', () => {
    expect(matchesFilter(species({ lightNeed: 'bright' }), 'sunbathers')).toBe(true);
    expect(matchesFilter(species({ lightNeed: 'low' }), 'shady')).toBe(true);
    expect(matchesFilter(species({ lightNeed: 'low' }), 'sunbathers')).toBe(false);
  });
});

describe('availableFilters', () => {
  it('keeps All and drops filters nothing matches', () => {
    const keys = availableFilters([species({ isToxicToPets: true, lightNeed: 'bright', wateringIntervalDays: 10 })])
      .map(filter => filter.key);

    expect(keys).toEqual(['all', 'sunbathers']);
  });

  it('labels every filter in sentence case', () => {
    PLANT_FILTERS.forEach(filter => {
      expect(filter.label.slice(1)).toBe(filter.label.slice(1).toLowerCase());
    });
  });
});

describe('the Library chips', () => {
  // The Library shows every chip whatever the grid holds (docs/search-spec.md §3.2) and has no
  // empty state (§2), so each chip must match something in either list the grid can show: the
  // unranked top ten, and the full catalog every climate ranking reorders.
  it.each([
    ['the top ten', rankPopularPlants(null)],
    ['the full catalog', POPULAR_PLANTS],
  ])('each match something in %s', (_, plants) => {
    const shown = plants.map(plant => getSpeciesById(plant.speciesId)).filter(
      (item): item is PlantSpecies => item != null,
    );

    for (const filter of PLANT_FILTERS) {
      expect(shown.some(item => matchesFilter(item, filter.key))).toBe(true);
    }
  });
});
