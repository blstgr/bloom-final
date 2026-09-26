import React from 'react';

import {
  buildPlantSchedule,
  isWateringDue,
  isWateringTooSoon,
  type PlantScheduleItem,
} from '../plants/data/schedule';
import type { OwnedPlant, PlantSpecies } from '../plants/data/types';

import { getWateringAdjustment } from './wateringAdjustment';
import { useWeather } from './WeatherProvider';

export type WateringSchedule = {
  buildSchedule: (ownedPlant: OwnedPlant, species: PlantSpecies, count?: number) => PlantScheduleItem[];
  isDue: (ownedPlant: OwnedPlant, species: PlantSpecies, now?: Date) => boolean;
  isTooSoon: (ownedPlant: OwnedPlant, species: PlantSpecies, now?: Date) => boolean;
};

/**
 * The schedule predicates, already bound to the current forecast.
 *
 * Every screen that asks whether a plant needs water goes through this — WaterScreen's list,
 * PlantDetailScreen's schedule and MainTabBar's badge alike. Adjusting in one and not the others
 * would give the badge and the list two different answers to the same question.
 *
 * The predicates are returned rather than the interval, so the adjusted number never has to be
 * threaded through a call site. Handing back a number meant every caller had to remember to pass
 * it, positionally, into each `schedule.ts` call: a new site that simply wrote
 * `isWateringDue(plant, species)` compiled, linted and type-checked clean while silently using
 * the unadjusted interval — which is exactly the divergence this exists to prevent.
 *
 * With the feature off, or before a location resolves, `WeatherProvider` holds no forecast and
 * these behave exactly as the unbound functions do.
 */
export function useWateringSchedule(): WateringSchedule {
  const { forecast } = useWeather();

  return React.useMemo(() => {
    const intervalFor = (species: PlantSpecies) =>
      getWateringAdjustment(species.wateringIntervalDays, forecast).effectiveIntervalDays;

    return {
      buildSchedule: (ownedPlant, species, count) =>
        buildPlantSchedule(ownedPlant, species, count, intervalFor(species)),
      isDue: (ownedPlant, species, now) =>
        isWateringDue(ownedPlant, species, now, intervalFor(species)),
      isTooSoon: (ownedPlant, species, now) =>
        isWateringTooSoon(ownedPlant, species, now, intervalFor(species)),
    };
  }, [forecast]);
}
