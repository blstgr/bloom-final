import {
  OPEN_METEO_FORECAST_BASE_URL,
  OPEN_METEO_GEOCODING_BASE_URL,
  REVERSE_GEOCODING_URL,
} from './constants';
import { readResponseBody, TOO_MANY_REQUESTS_STATUS } from './http';
import type {
  BigDataCloudReverseGeocodeResponse,
  GeoLocation,
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
    `${OPEN_METEO_GEOCODING_BASE_URL}/search?name=${query}&count=${GEOCODING_RESULT_COUNT}&language=en&format=json`,
  );

  // Open-Meteo omits `results` entirely rather than returning an empty array when nothing matches.
  return (response.results ?? []).map(result => ({
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
