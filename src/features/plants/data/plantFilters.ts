import type { TabItem } from '../../../components/ui/Tabs';

import { getDifficulty } from './difficulty';
import type { PlantSpecies } from './types';

/** The full set of filter keys, as a literal union — `matchesFilter` switches over it and fails to
 * compile if a key is added here without a rule. */
export type PlantFilterKey = 'all' | 'unkillable' | 'moody' | 'pet-safe' | 'sunbathers' | 'shady';

/**
 * The one set of plant filters, shared by Library and Favorites so the same idea never wears two
 * names. Short and a little cheeky on purpose — this is plant survival. See docs/search-spec.md §3.2.
 */
export const PLANT_FILTERS: TabItem<PlantFilterKey>[] = [
  { key: 'all', label: 'All' },
  { key: 'unkillable', label: 'Unkillable' },
  { key: 'moody', label: 'Moody' },
  { key: 'pet-safe', label: 'Pet-safe' },
  { key: 'sunbathers', label: 'Sunbathers' },
  { key: 'shady', label: 'Shady' },
];

/** Reached only if a key is added above without a case below, which TypeScript already refuses to
 * compile (the `default` branch's key narrows to `never` once every real case is handled). */
function assertUnhandledFilterKey(filterKey: never): never {
  throw new Error(`Unhandled plant filter key: ${String(filterKey)}`);
}

/** The rule each filter stands for, beside the keys it interprets. */
export function matchesFilter(species: PlantSpecies, filterKey: PlantFilterKey): boolean {
  switch (filterKey) {
    case 'all':
      return true;
    case 'unkillable':
      return getDifficulty(species.wateringIntervalDays) === 'easy';
    case 'moody':
      return getDifficulty(species.wateringIntervalDays) === 'diva';
    case 'pet-safe':
      return !species.isToxicToPets;
    case 'sunbathers':
      return species.lightNeed === 'bright';
    case 'shady':
      return species.lightNeed === 'low';
    default:
      return assertUnhandledFilterKey(filterKey);
  }
}

/** Only the filters that match at least one of `species` — a chip that would always show nothing
 * is noise. "All" always stays. */
export function availableFilters(species: PlantSpecies[]): TabItem<PlantFilterKey>[] {
  return PLANT_FILTERS.filter(
    filter => filter.key === 'all' || species.some(item => matchesFilter(item, filter.key)),
  );
}
