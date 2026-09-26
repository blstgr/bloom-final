import React from 'react';

import type { PlantSpecies } from '../plants/data/types';

import { getWateringAdjustment } from './wateringAdjustment';
import { useWeather } from './WeatherProvider';

/**
 * The watering interval to actually use for a species right now.
 *
 * Every screen that asks whether a plant needs water goes through this — WaterScreen's list,
 * PlantDetailScreen's schedule and MainTabBar's badge alike. Adjusting in one of them and not
 * the others would give the badge and the list two different answers to the same question.
 *
 * When the feature is off, or no location has resolved, `WeatherProvider` holds no forecast and
 * this returns the species' own interval unchanged — so callers need no "weather off" branch.
 */
export function useEffectiveWateringInterval(): (species: PlantSpecies) => number {
  const { forecast } = useWeather();

  return React.useCallback(
    (species: PlantSpecies) =>
      getWateringAdjustment(species.wateringIntervalDays, forecast).effectiveIntervalDays,
    [forecast],
  );
}
