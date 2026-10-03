import {
  OPEN_METEO_ARCHIVE_BASE_URL,
  OPEN_METEO_FORECAST_BASE_URL,
  OPEN_METEO_GEOCODING_BASE_URL,
  REVERSE_GEOCODING_URL,
} from './constants';
import { readResponseBody, TOO_MANY_REQUESTS_STATUS } from './http';
import type {
  BigDataCloudReverseGeocodeResponse,
  GeoLocation,
  LocationClimate,
  OpenMeteoArchiveResponse,
  OpenMeteoForecastResponse,
  OpenMeteoGeocodingResponse,
  WeatherForecast,
} from './types';

export type WeatherApiErrorKind = 'network' | 'rate-limited' | 'unknown';

export class WeatherApiError extends Error {
  kind: WeatherApiErrorKind;

  constructor(kind: WeatherApiErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'WeatherApiError';
  }
}

// The forecast horizon. Open-Meteo serves more, but a watering interval is recalculated every
// time the app opens, so a longer window would only average away the conditions that matter now.
const FORECAST_DAYS = 7;
const GEOCODING_RESULT_COUNT = 8;
// Asked for generously, because the town filter below discards villages and districts and the
// list should still fill.
const GEOCODING_REQUEST_COUNT = 30;
// Below this a place is a village, and it shows up in droves: "Kyiv" also matches a 108-person
// Kyiv and three 34-to-76-person Kyivskes. The forecast for a village is the nearby town's anyway.
const MIN_TOWN_POPULATION = 1000;
const CAPITAL_OR_SEAT = /^PPL(C|A\d?)$/;
const DISTRICT_FEATURE = 'PPLX';

async function fetchOpenMeteo<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new WeatherApiError('network', 'Could not reach the weather service.');
  }

  if (response.status === TOO_MANY_REQUESTS_STATUS) {
    const body = await readResponseBody(response);
    throw new WeatherApiError(
      'rate-limited',
      `Weather service rate limit exceeded for now.${body ? ` Response: ${body}` : ''}`,
    );
  }

  if (!response.ok) {
    const body = await readResponseBody(response);
    throw new WeatherApiError(
      'unknown',
      `Weather lookup failed with status ${response.status}.${body ? ` Response: ${body}` : ''}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * GET geocoding/v1/search?name=<city> — city name to coordinates.
 *
 * Also how a device-detected timezone becomes a location: the IANA zone's city segment
 * ("Europe/Kyiv" -> "Kyiv") is just another query here, so detection and manual choice share one
 * code path rather than each having their own.
 */
export async function searchLocations(name: string): Promise<GeoLocation[]> {
  const query = encodeURIComponent(name.trim());
  if (!query) return [];

  const response = await fetchOpenMeteo<OpenMeteoGeocodingResponse>(
    `${OPEN_METEO_GEOCODING_BASE_URL}/search?name=${query}&count=${GEOCODING_REQUEST_COUNT}&language=en&format=json`,
  );

  // Towns and cities only, one row per name. A capital or administrative seat always counts; a
  // district of a city (PPLX) never does — its city is the place someone lives; anything else
  // needs a known population of a town. Same-named survivors collapse to the first, which
  // Open-Meteo has already ranked by population: the list shows names alone, so two "Kyiv" rows
  // could not be told apart anyway.
  const seenNames = new Set<string>();
  const towns = (response.results ?? []).filter(result => {
    const code = result.feature_code ?? '';
    const isTown =
      CAPITAL_OR_SEAT.test(code) ||
      (code !== DISTRICT_FEATURE && (result.population ?? 0) >= MIN_TOWN_POPULATION);
    const nameKey = result.name.toLowerCase();
    if (!isTown || seenNames.has(nameKey)) return false;
    seenNames.add(nameKey);

    return true;
  });

  // Open-Meteo omits `results` entirely rather than returning an empty array when nothing matches.
  return towns.slice(0, GEOCODING_RESULT_COUNT).map(result => ({
    admin1: result.admin1,
    country: result.country,
    latitude: result.latitude,
    locationId: String(result.id),
    longitude: result.longitude,
    name: result.name,
    timezone: result.timezone,
  }));
}

/**
 * Coordinates to a place, for a location the device reported rather than one the user typed.
 *
 * Open-Meteo's geocoder is forward-only, so this is the one thing it cannot answer. The name is
 * needed purely to show the user where the forecast is for — the forecast itself only ever needs
 * the coordinates, which is why a failure here still yields a usable location.
 */
// OpenStreetMap's city/town boundary level. Where one is mapped it names the city itself.
const CITY_ADMIN_LEVEL = 8;

/**
 * The city name, which is not simply the `city` field.
 *
 * For Kharkiv that field returns "Kharkiv Raion" — the surrounding district, not the city — while
 * the level-8 boundary correctly says "Kharkiv". For Kyiv there is no level-8 boundary at all and
 * `city` is right. So: the boundary when it exists, the field otherwise.
 */
function pickCityName(response: BigDataCloudReverseGeocodeResponse): string | undefined {
  const cityBoundary = response.localityInfo?.administrative?.find(
    area => area.adminLevel === CITY_ADMIN_LEVEL,
  );

  return cityBoundary?.name ?? response.city ?? response.locality;
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoLocation> {
  const fallback: GeoLocation = {
    country: '',
    latitude,
    locationId: `${latitude},${longitude}`,
    longitude,
    name: 'Current location',
    timezone: '',
  };

  try {
    const response = await fetchOpenMeteo<BigDataCloudReverseGeocodeResponse>(
      `${REVERSE_GEOCODING_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    );
    const name = pickCityName(response);

    return name
      ? {
          admin1: response.principalSubdivision,
          country: response.countryName ?? '',
          latitude,
          locationId: `${latitude},${longitude}`,
          longitude,
          name,
          timezone: '',
        }
      : fallback;
  } catch {
    // The coordinates are the part that matters; a nameless location still produces the right
    // forecast, and the settings row can say "Current location" rather than nothing.
    return fallback;
  }
}

/**
 * GET forecast?daily=... — the daily series the watering adjustment reads.
 *
 * `et0_fao_evapotranspiration` is the one that matters: it folds temperature, humidity, wind and
 * radiation into a single millimetres-per-day figure for how fast water leaves soil. That is why
 * a humid 31C day in Singapore comes out gentler than a dry 32C one in Madrid, which no
 * temperature threshold would catch.
 */
export async function getForecast(latitude: number, longitude: number): Promise<WeatherForecast> {
  const response = await fetchOpenMeteo<OpenMeteoForecastResponse>(
    `${OPEN_METEO_FORECAST_BASE_URL}/forecast?latitude=${latitude}&longitude=${longitude}` +
      '&daily=temperature_2m_max,relative_humidity_2m_mean,et0_fao_evapotranspiration,precipitation_sum' +
      `&timezone=auto&forecast_days=${FORECAST_DAYS}`,
  );

  const { daily } = response;

  return {
    days: daily.time.map((date, index) => ({
      date,
      et0: daily.et0_fao_evapotranspiration[index],
      humidityMean: daily.relative_humidity_2m_mean[index],
      precipitation: daily.precipitation_sum[index],
      temperatureMax: daily.temperature_2m_max[index],
    })),
    fetchedAt: new Date().toISOString(),
    latitude: response.latitude,
    longitude: response.longitude,
    timezone: response.timezone,
  };
}

// Three full years: one is too noisy for a hardiness zone (a single mild winter shifts it), and
// more buys little for a ranking that only uses the zone as a tie-breaker.
const CLIMATE_YEARS = 3;
const YEAR_PREFIX_LENGTH = 4;

/**
 * GET archive?daily=temperature_2m_min,relative_humidity_2m_mean — the last few complete years.
 *
 * Complete calendar years only, so every year contributes a whole winter to its minimum and the
 * archive's few-day publishing lag never truncates the current one.
 */
export async function getLocationClimate(latitude: number, longitude: number, now = new Date()): Promise<LocationClimate> {
  const lastYear = now.getFullYear() - 1;
  const firstYear = lastYear - CLIMATE_YEARS + 1;
  const response = await fetchOpenMeteo<OpenMeteoArchiveResponse>(
    `${OPEN_METEO_ARCHIVE_BASE_URL}/archive?latitude=${latitude}&longitude=${longitude}` +
      `&start_date=${firstYear}-01-01&end_date=${lastYear}-12-31` +
      '&daily=temperature_2m_min,relative_humidity_2m_mean&timezone=auto',
  );

  const minimumsByYear = new Map<string, number>();
  let humiditySum = 0;
  let humidityCount = 0;

  response.daily.time.forEach((date, index) => {
    const minimum = response.daily.temperature_2m_min[index];
    const humidity = response.daily.relative_humidity_2m_mean[index];
    const year = date.slice(0, YEAR_PREFIX_LENGTH);

    if (minimum != null) {
      minimumsByYear.set(year, Math.min(minimumsByYear.get(year) ?? minimum, minimum));
    }
    if (humidity != null) {
      humiditySum += humidity;
      humidityCount += 1;
    }
  });

  if (minimumsByYear.size === 0 || humidityCount === 0) {
    throw new WeatherApiError('unknown', 'The climate archive returned no data for this location.');
  }

  return {
    annualMinimumsC: [...minimumsByYear.keys()].sort().map(year => minimumsByYear.get(year) as number),
    humidityMean: humiditySum / humidityCount,
    latitude: response.latitude,
  };
}
