// Two points closer than this share an answer: Open-Meteo resolves to a weather grid, so more
// precision would only fragment a cache without changing what comes back.
const COORDINATE_CACHE_PRECISION = 2;

/**
 * The cache key for anything fetched from Open-Meteo by position — the forecast and the climate
 * alike. One definition, so the two caches cannot drift apart on what counts as the same place.
 */
export function coordinateCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(COORDINATE_CACHE_PRECISION)},${longitude.toFixed(COORDINATE_CACHE_PRECISION)}`;
}
