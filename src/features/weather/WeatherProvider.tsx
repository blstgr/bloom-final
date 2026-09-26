import React from 'react';

import type { GeoLocation, WeatherForecast } from '../../services/types';
import { getForecast, WeatherApiError } from '../../services/weatherApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectActiveLocation,
  selectWeatherAdjustmentEnabled,
  setDetectedLocation,
} from '../../store/settingsSlice';

import { detectDeviceLocation } from './deviceLocation';

const ONE_HOUR_MS = 3_600_000;

export type WeatherFailureReason = 'network' | 'rate-limited' | 'unknown';

export type WeatherContextValue = {
  error: WeatherFailureReason | null;
  forecast: WeatherForecast | null;
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

  const [forecast, setForecast] = React.useState<WeatherForecast | null>(null);
  const [error, setError] = React.useState<WeatherFailureReason | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [refreshToken, setRefreshToken] = React.useState(0);

  const cacheRef = React.useRef(new Map<string, WeatherForecast>());
  const inFlightRef = React.useRef(new Map<string, Promise<WeatherForecast>>());

  const refresh = React.useCallback(() => {
    cacheRef.current.clear();
    setRefreshToken(token => token + 1);
  }, []);

  // Detection runs once, and only while it is the thing deciding the location. A user who has
  // chosen a city is not waiting on the device's timezone.
  const shouldDetect = isEnabled && activeLocation == null;
  React.useEffect(() => {
    if (!shouldDetect) return undefined;

    let cancelled = false;
    detectDeviceLocation()
      .then(detected => {
        if (!cancelled && detected) dispatch(setDetectedLocation(detected));
      })
      .catch(() => {
        // Leaves the location unresolved, which the settings screen renders as such. There is no
        // useful fallback: a guessed city would silently shift the user's watering schedule.
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, shouldDetect]);

  React.useEffect(() => {
    if (!isEnabled || !activeLocation) {
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

    // Two screens mounting at once must not become two requests for the same place.
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
  }, [activeLocation, isEnabled, refreshToken]);

  const value = React.useMemo<WeatherContextValue>(
    () => ({ error, forecast, isLoading, refresh }),
    [error, forecast, isLoading, refresh],
  );

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeather(): WeatherContextValue {
  const value = React.useContext(WeatherContext);
  if (!value) throw new Error('useWeather must be used inside WeatherProvider');

  return value;
}
