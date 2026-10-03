import React from 'react';

import { coordinateCacheKey } from '../../../services/coordinateKey';
import type { LocationClimate } from '../../../services/types';
import { getLocationClimate } from '../../../services/weatherApi';
import { useAppSelector } from '../../../store/hooks';
import { selectActiveLocation, selectWeatherAdjustmentEnabled } from '../../../store/settingsSlice';

import { getSpeciesById } from './catalog';
import { rankPopularPlants } from './popularPlantRanking';
import type { PlantSpecies } from './types';

// A climate is years of history, so it never changes within a session; one request per place.
// Module scope rather than component state, so leaving and re-entering the Library does not ask
// again. Keyed by rounded coordinates, the same key as the forecast cache.
const climateCache = new Map<string, LocationClimate>();

/** Empties the climate cache, which otherwise outlives every render. Exists for tests. */
export function clearClimateCache() {
  climateCache.clear();
}

/**
 * The Library's popular plants, best suited to the active location first (docs/search-spec.md §3).
 *
 * With no location — detection pending, permission refused, the weather feature off — or while
 * the climate is loading or has failed, it is the top ten by popularity, so the grid is never empty
 * and nothing waits on a permission prompt. The ranked list replaces it once a climate arrives.
 */
export function usePopularPlants(): PlantSpecies[] {
  const activeLocation = useAppSelector(selectActiveLocation);
  const isWeatherEnabled = useAppSelector(selectWeatherAdjustmentEnabled);
  // With the weather feature off the app holds no location for any purpose, stored city or not
  // (docs/search-spec.md §3.3).
  const location = isWeatherEnabled ? activeLocation : null;
  // Only the coordinates matter. Depending on the whole location would refetch whenever an
  // unrelated field of the same place (its display name) changed.
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const key = latitude != null && longitude != null ? coordinateCacheKey(latitude, longitude) : null;
  const [climate, setClimate] = React.useState<LocationClimate | null>(() =>
    key ? climateCache.get(key) ?? null : null,
  );

  React.useEffect(() => {
    if (latitude == null || longitude == null || key == null) {
      setClimate(null);
      return undefined;
    }

    const cached = climateCache.get(key);
    if (cached) {
      setClimate(cached);
      return undefined;
    }

    // Back to the top ten while the new place loads, rather than the last place's ranking.
    setClimate(null);
    let cancelled = false;
    getLocationClimate(latitude, longitude)
      .then(result => {
        climateCache.set(key, result);
        if (!cancelled) setClimate(result);
      })
      .catch(() => {
        // The unranked list is a complete answer, so a failed climate request shows nothing.
        if (!cancelled) setClimate(null);
      });

    return () => {
      cancelled = true;
    };
  }, [key, latitude, longitude]);

  return React.useMemo(
    () =>
      rankPopularPlants(climate)
        .map(plant => getSpeciesById(plant.speciesId))
        .filter((species): species is PlantSpecies => species != null),
    [climate],
  );
}
