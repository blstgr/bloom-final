import type { LocationClimate } from '../../../services/types';

import { POPULAR_PLANTS, type PopularPlant } from './popularPlants';

/** How many plants the grid shows when there is no location to rank for. */
export const NO_LOCATION_PLANT_COUNT = 10;

const WINTER_SOLSTICE_DECLINATION_DEG = 23.44;
const DEGREES_TO_RADIANS = Math.PI / 180;
const HOURS_PER_DAY = 24;

/**
 * Hours of daylight on the shortest day of the year at this latitude — the astronomical day
 * length at the winter solstice, so it needs no request. Polar latitudes clamp to 0 (polar night).
 */
export function winterDaylightHours(latitude: number): number {
  // The local winter solstice is the one where the sun is over the opposite hemisphere.
  const declination = -Math.sign(latitude || 1) * WINTER_SOLSTICE_DECLINATION_DEG * DEGREES_TO_RADIANS;
  const cosHourAngle = -Math.tan(latitude * DEGREES_TO_RADIANS) * Math.tan(declination);
  const clamped = Math.min(1, Math.max(-1, cosHourAngle));

  return (HOURS_PER_DAY / Math.PI) * Math.acos(clamped);
}

const FAHRENHEIT_SCALE = 9 / 5;
const FAHRENHEIT_OFFSET = 32;
// USDA: zone 1 starts at -60F and each zone spans 10F.
const USDA_ZONE_ORIGIN_F = 60;
const USDA_ZONE_WIDTH_F = 10;
const MIN_ZONE = 1;
const MAX_ZONE = 13;

/** USDA hardiness zone from each year's coldest night: the mean extreme minimum, in 10F bands. */
export function hardinessZoneFromMinimums(annualMinimumsC: number[]): number {
  const mean = annualMinimumsC.reduce((sum, value) => sum + value, 0) / annualMinimumsC.length;
  const fahrenheit = mean * FAHRENHEIT_SCALE + FAHRENHEIT_OFFSET;
  const zone = Math.floor((fahrenheit + USDA_ZONE_ORIGIN_F) / USDA_ZONE_WIDTH_F) + 1;

  return Math.min(MAX_ZONE, Math.max(MIN_ZONE, zone));
}

// Below this many hours of December daylight a room is dim for months (Kyiv ~8h, London ~7.8h);
// above the upper bound winter light is plentiful (Delhi ~10.5h, Singapore ~12h).
const SHORT_WINTER_DAY_HOURS = 9;
const LONG_WINTER_DAY_HOURS = 10.5;
// Outdoor air this dry stays dry indoors. And a cold zone means months of heated air, which is
// drier than the outdoor reading suggests — so a cold zone counts as dry whatever its humidity.
const DRY_HUMIDITY_PERCENT = 55;
const HUMID_HUMIDITY_PERCENT = 75;
const HEATED_WINTER_MAX_ZONE = 6;
// The tie-breaker: how much each degree of cold tolerance is worth in a cold zone. Small on
// purpose — it should reorder near-equal plants, never outweigh light or humidity.
const COLD_TOLERANCE_WEIGHT = 0.1;
const COLD_TOLERANCE_REFERENCE_C = 15;

const SHORT_DAY_LIGHT_SCORES = { bright: -6, low: 8, medium: 2 } as const;
const MID_DAY_LIGHT_SCORES = { bright: 0, low: 3, medium: 1 } as const;
const LONG_DAY_LIGHT_SCORES = { bright: 3, low: 0, medium: 1 } as const;
const SHORT_DAY_FULL_SUN_PENALTY = -6;
const MID_DAY_FULL_SUN_PENALTY = -2;
const LONG_DAY_FULL_SUN_BONUS = 4;
const DRY_HUMIDITY_SCORES = { high: -8, low: 6, medium: 0 } as const;
const HUMID_HUMIDITY_SCORES = { high: 4, low: 0, medium: 1 } as const;

function lightScore(plant: PopularPlant, daylightHours: number): number {
  if (daylightHours < SHORT_WINTER_DAY_HOURS) {
    return SHORT_DAY_LIGHT_SCORES[plant.minLight] + (plant.needsFullSun ? SHORT_DAY_FULL_SUN_PENALTY : 0);
  }
  if (daylightHours < LONG_WINTER_DAY_HOURS) {
    return MID_DAY_LIGHT_SCORES[plant.minLight] + (plant.needsFullSun ? MID_DAY_FULL_SUN_PENALTY : 0);
  }

  return LONG_DAY_LIGHT_SCORES[plant.minLight] + (plant.needsFullSun ? LONG_DAY_FULL_SUN_BONUS : 0);
}

function humidityScore(plant: PopularPlant, humidityMean: number, zone: number): number {
  if (humidityMean < DRY_HUMIDITY_PERCENT || zone <= HEATED_WINTER_MAX_ZONE) {
    return DRY_HUMIDITY_SCORES[plant.humidityNeed];
  }
  if (humidityMean >= HUMID_HUMIDITY_PERCENT) return HUMID_HUMIDITY_SCORES[plant.humidityNeed];

  return 0;
}

function coldScore(plant: PopularPlant, zone: number): number {
  if (zone > HEATED_WINTER_MAX_ZONE) return 0;

  return (COLD_TOLERANCE_REFERENCE_C - plant.minTempC) * COLD_TOLERANCE_WEIGHT;
}

/** Popularity as points: the most popular plant earns the most. */
function popularityScore(plant: PopularPlant): number {
  return POPULAR_PLANTS.length + 1 - plant.popularityRank;
}

/**
 * The popular plants, best suited to this climate first.
 *
 * Popularity is the base, and the climate adjusts it: a short winter day promotes plants that cope
 * with low light, a dry climate (or heated winter air) demotes humidity lovers, and cold tolerance
 * breaks ties in cold zones. With no climate, the top {@link NO_LOCATION_PLANT_COUNT} by popularity.
 */
export function rankPopularPlants(climate: LocationClimate | null): PopularPlant[] {
  const byPopularity = [...POPULAR_PLANTS].sort((a, b) => a.popularityRank - b.popularityRank);
  if (!climate) return byPopularity.slice(0, NO_LOCATION_PLANT_COUNT);

  const daylightHours = winterDaylightHours(climate.latitude);
  const zone = hardinessZoneFromMinimums(climate.annualMinimumsC);
  const score = (plant: PopularPlant) =>
    popularityScore(plant) +
    lightScore(plant, daylightHours) +
    humidityScore(plant, climate.humidityMean, zone) +
    coldScore(plant, zone);

  return byPopularity
    .map(plant => ({ plant, score: score(plant) }))
    // Stable on equal scores, so popularity order survives a tie.
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.plant);
}
