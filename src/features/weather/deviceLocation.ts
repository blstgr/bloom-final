import Geolocation from '@react-native-community/geolocation';

import type { GeoLocation } from '../../services/types';
import { reverseGeocode, searchLocations } from '../../services/weatherApi';

// Coarse is all the feature can use — a forecast resolves to a weather grid — and a cached fix
// avoids waking the GPS chip for something that does not need street-level accuracy.
const TEN_MINUTES_MS = 600_000;
const POSITION_TIMEOUT_MS = 15_000;
const POSITION_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: TEN_MINUTES_MS,
  timeout: POSITION_TIMEOUT_MS,
} as const;

// "When in use" only: Bloom has nothing to do with your location while it is closed, and asking
// for "always" would be a larger permission than the feature could justify.
Geolocation.setRNConfiguration({
  authorizationLevel: 'whenInUse',
  enableBackgroundLocationUpdates: false,
  locationProvider: 'auto',
  skipPermissionRequests: false,
});

function requestAuthorization(): Promise<void> {
  return new Promise((resolve, reject) => {
    Geolocation.requestAuthorization(resolve, reject);
  });
}

function getCurrentPosition(): Promise<GeolocationPositionLike> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, POSITION_OPTIONS);
  });
}

type GeolocationPositionLike = {
  coords: { latitude: number; longitude: number };
};

/**
 * Zones IANA has renamed, mapped to the current city name.
 *
 * The old identifiers survive as backward-compatible aliases, so a device can still report
 * `Europe/Kiev` years after the zone became `Europe/Kyiv` — this machine does. Showing a user the
 * superseded name of their own city is worth the few lines it costs to avoid. Keys are compared
 * against the whole zone, not the city segment, so an unrelated place that happens to share a
 * name is unaffected.
 */
const RENAMED_TIME_ZONE_CITIES: Record<string, string> = {
  'America/Godthab': 'Nuuk',
  'Asia/Calcutta': 'Kolkata',
  'Asia/Katmandu': 'Kathmandu',
  'Asia/Rangoon': 'Yangon',
  'Asia/Saigon': 'Ho Chi Minh City',
  'Europe/Kiev': 'Kyiv',
  'Europe/Uzhgorod': 'Uzhhorod',
  'Europe/Zaporozhye': 'Zaporizhzhia',
};

/**
 * The city segment of the device's IANA timezone, e.g. "Europe/Kyiv" -> "Kyiv".
 *
 * This is the same mechanism iOS's own Date & Time settings use: "Set Automatically" resolves a
 * time zone and displays it as a city. It needs no location permission and no native module,
 * which is the whole reason the feature can ship without touching the iOS or Android projects.
 *
 * Returns null rather than guessing when the zone is missing, is a bare UTC offset, or names no
 * city — a wrong city is worse than no city, because the user cannot tell the schedule is being
 * adjusted for somewhere they have never been.
 */
export function getDeviceTimeZoneCity(): string | null {
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }

  if (!timeZone || !timeZone.includes('/')) return null;

  const renamed = RENAMED_TIME_ZONE_CITIES[timeZone];
  if (renamed) return renamed;

  const city = timeZone.split('/').at(-1)?.replace(/_/g, ' ').trim();

  return city ? city : null;
}

/**
 * The time zone's namesake city, resolved to coordinates.
 *
 * A fallback, not the primary path: a zone is a region, not a point. `Europe/Kyiv` covers all of
 * Ukraine, so this puts everyone in that zone in Kyiv — right country, arbitrary city. Good
 * enough to seed a guess someone can correct, not good enough to be the answer.
 */
export async function detectLocationFromTimeZone(): Promise<GeoLocation | null> {
  const city = getDeviceTimeZoneCity();
  if (!city) return null;

  const matches = await searchLocations(city);
  const match = matches[0];
  if (!match) return null;

  // Keep the device's own spelling of the city and take only the coordinates from the geocoder.
  // Open-Meteo's dataset still carries some older transliterations -- searching the IANA zone
  // "Europe/Kyiv" returns a place named "Kiev" -- and showing a user a different name for their
  // own city than their phone uses reads as a bug, not as data provenance.
  return { ...match, name: city };
}

/**
 * Where the device actually is, falling back to its time zone.
 *
 * The forecast needs a point and a time zone only gives a region, so GPS is the primary source.
 * Permission refusal is not an error state here: the user has said no to one way of answering the
 * question, and the time-zone guess is still better than nothing — with the city picker available
 * for anyone the guess gets wrong.
 */
export async function detectDeviceLocation(): Promise<GeoLocation | null> {
  try {
    // Asked for explicitly rather than left to the first position request. Only ever reached after
    // the in-app explainer has been answered — WeatherProvider holds detection until then.
    await requestAuthorization();
    const position = await getCurrentPosition();

    return await reverseGeocode(position.coords.latitude, position.coords.longitude);
  } catch {
    return detectLocationFromTimeZone();
  }
}
