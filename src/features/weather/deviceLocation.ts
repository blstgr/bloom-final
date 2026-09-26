import type { GeoLocation } from '../../services/types';
import { searchLocations } from '../../services/weatherApi';

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
 * Resolve the device's timezone to coordinates, or null if it cannot be resolved.
 *
 * Geocoding the city name rather than shipping a zone-to-coordinate table means detection and a
 * manual city choice go through exactly one code path.
 */
export async function detectDeviceLocation(): Promise<GeoLocation | null> {
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
