import type { WeatherForecast } from '../../services/types';

import { getWateringAdjustment } from './wateringAdjustment';

const BASE_INTERVAL_DAYS = 14;

function buildForecast(et0Readings: number[]): WeatherForecast {
  return {
    days: et0Readings.map((et0, index) => ({
      date: `2026-09-${String(index + 1).padStart(2, '0')}`,
      et0,
      humidityMean: 60,
      precipitation: 0,
      temperatureMax: 20,
    })),
    fetchedAt: '2026-09-26T12:00:00.000Z',
    latitude: 50.45,
    longitude: 30.52,
    timezone: 'Europe/Kyiv',
  };
}

describe('getWateringAdjustment', () => {
  it('leaves the interval alone at the reference evapotranspiration', () => {
    const adjustment = getWateringAdjustment(BASE_INTERVAL_DAYS, buildForecast([3, 3, 3]));

    expect(adjustment).toEqual({
      effectiveIntervalDays: BASE_INTERVAL_DAYS,
      factor: 1,
      reason: 'unchanged',
    });
  });

  it('shortens the interval when conditions are drier than the reference', () => {
    // Dubai's measured mean, 5.89 mm/day.
    const adjustment = getWateringAdjustment(BASE_INTERVAL_DAYS, buildForecast([5.89]));

    expect(adjustment.effectiveIntervalDays).toBe(10);
    expect(adjustment.reason).toBe('drier-than-usual');
  });

  it('lengthens the interval when conditions are wetter than the reference', () => {
    // Kyiv's measured mean, 1.96 mm/day.
    const adjustment = getWateringAdjustment(BASE_INTERVAL_DAYS, buildForecast([1.96]));

    expect(adjustment.effectiveIntervalDays).toBe(17);
    expect(adjustment.reason).toBe('wetter-than-usual');
  });

  it('damps the ratio rather than applying it directly', () => {
    // Undamped, 3.0/12 would be a factor of 0.25 and a 4-day interval; the square root keeps a
    // pot's reservoir in the picture, and the floor keeps the species interval meaningful.
    const adjustment = getWateringAdjustment(BASE_INTERVAL_DAYS, buildForecast([12]));

    expect(adjustment.factor).toBeCloseTo(0.7);
    expect(adjustment.effectiveIntervalDays).toBe(10);
  });

  it('clamps an extremely wet location to the upper bound', () => {
    // Reykjavik's measured mean, 1.12 mm/day, whose raw damped factor exceeds the cap.
    const adjustment = getWateringAdjustment(BASE_INTERVAL_DAYS, buildForecast([1.12]));

    expect(adjustment.factor).toBeCloseTo(1.4);
    expect(adjustment.effectiveIntervalDays).toBe(20);
  });

  it('never returns an interval below one day', () => {
    const adjustment = getWateringAdjustment(1, buildForecast([12]));

    expect(adjustment.effectiveIntervalDays).toBe(1);
  });

  it('averages across the whole forecast window', () => {
    const varied = getWateringAdjustment(BASE_INTERVAL_DAYS, buildForecast([1, 3, 5]));
    const flat = getWateringAdjustment(BASE_INTERVAL_DAYS, buildForecast([3]));

    expect(varied).toEqual(flat);
  });

  it('ignores non-finite readings rather than poisoning the mean', () => {
    const withGap = getWateringAdjustment(BASE_INTERVAL_DAYS, buildForecast([3, Number.NaN, 3]));

    expect(withGap.effectiveIntervalDays).toBe(BASE_INTERVAL_DAYS);
  });

  it('returns the unadjusted interval when there is no forecast', () => {
    expect(getWateringAdjustment(BASE_INTERVAL_DAYS, null)).toEqual({
      effectiveIntervalDays: BASE_INTERVAL_DAYS,
      factor: 1,
      reason: 'unchanged',
    });
  });

  it('returns the unadjusted interval when the forecast has no readings', () => {
    expect(getWateringAdjustment(BASE_INTERVAL_DAYS, buildForecast([])).effectiveIntervalDays)
      .toBe(BASE_INTERVAL_DAYS);
  });
});
