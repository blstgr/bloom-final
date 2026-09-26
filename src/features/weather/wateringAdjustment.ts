import type { WeatherForecast } from '../../services/types';

/**
 * Mean daily evapotranspiration of a temperate growing season — the ambient dryness the
 * per-species intervals in mockPlants and Perenual implicitly assume. Fitted against live
 * Open-Meteo data for twelve cities spanning Reykjavik to Dubai, not chosen by intuition: an
 * earlier value of 2.5 sat near the wet end of the real distribution and drove eight of those
 * twelve onto a clamp, which made the clamps rather than the weather decide the schedule.
 */
const REFERENCE_ET0_MM_PER_DAY = 3.0;
/**
 * Soil-moisture depletion is not linear in evaporative demand: a pot holds a reservoir, so
 * doubling ET0 does not halve the time it takes to dry out. Square-rooting the ratio models that
 * buffering, and incidentally spreads the twelve cities across nine distinct intervals instead of
 * bunching them on the bounds.
 */
const ADJUSTMENT_DAMPING = 0.5;
const MIN_ADJUSTMENT_FACTOR = 0.7;
const MAX_ADJUSTMENT_FACTOR = 1.4;
const MIN_INTERVAL_DAYS = 1;

export type WateringAdjustmentReason = 'drier-than-usual' | 'unchanged' | 'wetter-than-usual';

export type WateringAdjustment = {
  effectiveIntervalDays: number;
  factor: number;
  reason: WateringAdjustmentReason;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Describes the interval the caller actually gets, not the raw ratio. A factor of 0.93 that
 * rounds back to the same number of days has changed nothing, and saying "drier than usual" about
 * an unchanged schedule would be a claim the UI cannot back up. */
function getReason(effectiveIntervalDays: number, baseIntervalDays: number): WateringAdjustmentReason {
  if (effectiveIntervalDays < baseIntervalDays) return 'drier-than-usual';
  if (effectiveIntervalDays > baseIntervalDays) return 'wetter-than-usual';

  return 'unchanged';
}

/**
 * Adjust a species' watering interval for the conditions in the forecast.
 *
 * ET0 is an outdoor reference measure and a houseplant does not experience it directly; it is
 * used here as a proxy for seasonal and ambient dryness. That approximation is exactly why this
 * is something the user turns on rather than a default, and why the factor is clamped: the
 * species interval is horticultural knowledge, and a weather proxy should nudge it, not overrule
 * it.
 *
 * Returns the unchanged interval when there is no forecast to read, so callers need no separate
 * "weather off" path.
 */
export function getWateringAdjustment(
  baseIntervalDays: number,
  forecast: WeatherForecast | null,
): WateringAdjustment {
  const readings =
    forecast?.days
      .map(day => day.et0)
      .filter((et0): et0 is number => et0 != null && Number.isFinite(et0)) ?? [];
  if (readings.length === 0) {
    return { effectiveIntervalDays: baseIntervalDays, factor: 1, reason: 'unchanged' };
  }

  const meanEt0 = readings.reduce((total, et0) => total + et0, 0) / readings.length;
  // A location with no evaporative demand at all would divide by zero; treat it as the reference.
  const ratio = meanEt0 === 0 ? 1 : REFERENCE_ET0_MM_PER_DAY / meanEt0;
  const factor = clamp(ratio ** ADJUSTMENT_DAMPING, MIN_ADJUSTMENT_FACTOR, MAX_ADJUSTMENT_FACTOR);
  const effectiveIntervalDays = Math.max(
    Math.round(baseIntervalDays * factor),
    MIN_INTERVAL_DAYS,
  );

  return {
    effectiveIntervalDays,
    factor,
    reason: getReason(effectiveIntervalDays, baseIntervalDays),
  };
}
