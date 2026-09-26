import React from 'react';

import type { GeoLocation, WeatherForecast } from '../../services/types';
import { getForecast, WeatherApiError } from '../../services/weatherApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectActiveLocation,
  selectIsSettingsHydrated,
  selectWeatherAdjustmentEnabled,
  setDetectedLocation,
} from '../../store/settingsSlice';

import { detectDeviceLocation } from './deviceLocation';

const ONE_HOUR_MS = 3_600_000;

export type WeatherFailureReason = 'network' | 'rate-limited' | 'unknown';

export type WeatherContextValue = {
  error: WeatherFailureReason | null;
  forecast: WeatherForecast | null;
  /** True once detection has run to a conclusion, whether or not it found a city. Lets the
   * settings row stop saying "Detecting..." when there is nothing more to wait for. */
  hasAttemptedDetection: boolean;
  isLoading: boolean;
  refresh: () => void;
};

const WeatherContext = React.createContext<WeatherContextValue | null>(null);

// A daily forecast does not change minute to minute, and the watering interval is recomputed on
// every launch anyway — an hour is well inside the useful resolution and keeps the app off the
// network on a quick reopen.
const FORECAST_MAX_AGE_MS = ONE_HOUR_MS;
// Two points closer than this share a forecast: Open-Meteo resolves to a weather grid, so more
// precision would only fragment the cache without changing the answer.
const COORDINATE_CACHE_PRECISION = 2;

function getCacheKey(location: GeoLocation): string {
  return [
    location.latitude.toFixed(COORDINATE_CACHE_PRECISION),
    location.longitude.toFixed(COORDINATE_CACHE_PRECISION),
  ].join(',');
}

function toFailureReason(error: unknown): WeatherFailureReason {
  return error instanceof WeatherApiError && error.kind !== 'unknown' ? error.kind : 'unknown';
}

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const activeLocation = useAppSelector(selectActiveLocation);
  const isEnabled = useAppSelector(selectWeatherAdjustmentEnabled);
  const isHydrated = useAppSelector(selectIsSettingsHydrated);
  const autoDetectLocation = useAppSelector(state => state.settings.autoDetectLocation);

  const [forecast, setForecast] = React.useState<WeatherForecast | null>(null);
  const [error, setError] = React.useState<WeatherFailureReason | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [refreshToken, setRefreshToken] = React.useState(0);
  // Distinguishes "still looking" from "looked and found nothing", which a null location alone
  // cannot express — without it a failed detection shows a progress state forever.
  const [hasAttemptedDetection, setHasAttemptedDetection] = React.useState(false);

  const cacheRef = React.useRef(new Map<string, WeatherForecast>());
  const inFlightRef = React.useRef(new Map<string, Promise<WeatherForecast>>());

  const refresh = React.useCallback(() => {
    cacheRef.current.clear();
    // Also drop anything outstanding: keeping it would make the refresh adopt the very promise
    // it was asked to supersede, which is the one case the dedup map exists to handle.
    inFlightRef.current.clear();
    setRefreshToken(token => token + 1);
  }, []);

  // Nothing runs until the saved settings are back. Child effects fire before parent ones, so
  // without this the provider would act on defaults — fetching a forecast for a user who had
  // turned the feature off, and re-detecting a location already sitting on disk.
  //
  // Once per launch while detection is on, rather than only when no city is stored: a persisted
  // `detectedLocation` would otherwise pin someone to wherever they first opened the app, while
  // the switch still claimed to be detecting. Deliberately not a comparison against the stored
  // city — the device's position is the thing being asked for, and comparing names would mean
  // re-asking on every render whenever the two disagreed, which is exactly when they differ.
  const shouldDetect =
    isHydrated && isEnabled && autoDetectLocation && !hasAttemptedDetection;

  // Switching detection off arms it to run again on the way back on, so a user who travels can
  // re-detect without relaunching.
  React.useEffect(() => {
    if (!autoDetectLocation) setHasAttemptedDetection(false);
  }, [autoDetectLocation]);

  React.useEffect(() => {
    if (!shouldDetect) return undefined;

    let cancelled = false;
    detectDeviceLocation()
      .then(detected => {
        if (cancelled) return;
        // Recorded either way. `null` is a resolved answer — "the device names no city we can
        // place" — and the settings row needs to tell that apart from still looking.
        dispatch(setDetectedLocation(detected));
      })
      .catch(() => {
        if (!cancelled) dispatch(setDetectedLocation(null));
      })
      .finally(() => {
        if (!cancelled) setHasAttemptedDetection(true);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, shouldDetect]);

  React.useEffect(() => {
    if (!isHydrated || !isEnabled || !activeLocation) {
      setForecast(null);
      setError(null);
      setIsLoading(false);

      return undefined;
    }

    const cacheKey = getCacheKey(activeLocation);
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < FORECAST_MAX_AGE_MS) {
      setForecast(cached);
      setError(null);
      setIsLoading(false);

      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    // Coalesces a location that flips away and back while a fetch is outstanding (A -> B -> A)
  // onto the request already running, rather than starting a second one for the same place.
    const pending =
      inFlightRef.current.get(cacheKey) ??
      getForecast(activeLocation.latitude, activeLocation.longitude);
    inFlightRef.current.set(cacheKey, pending);

    pending
      .then(result => {
        cacheRef.current.set(cacheKey, result);
        if (cancelled) return;
        setForecast(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setForecast(null);
        setError(toFailureReason(caught));
      })
      .finally(() => {
        inFlightRef.current.delete(cacheKey);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeLocation, isEnabled, isHydrated, refreshToken]);

  const value = React.useMemo<WeatherContextValue>(
    () => ({ error, forecast, hasAttemptedDetection, isLoading, refresh }),
    [error, forecast, hasAttemptedDetection, isLoading, refresh],
  );

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeather(): WeatherContextValue {
  const value = React.useContext(WeatherContext);
  if (!value) throw new Error('useWeather must be used inside WeatherProvider');

  return value;
}
