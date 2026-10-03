import AsyncStorage from '@react-native-async-storage/async-storage';
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import type { FavoritesState } from './favoritesSlice';
import { addFavorite, removeFavorite, toggleFavorite } from './favoritesSlice';
import {
  answerLocationPrompt,
  setAutoDetectLocation,
  setDarkTheme,
  setDetectedLocation,
  setFollowSystemTheme,
  setSelectedLocation,
  setWeatherAdjustmentEnabled,
  type SettingsState,
} from './settingsSlice';

const FAVORITES_STORAGE_KEY = 'bloom.favorites.v1';
const SETTINGS_STORAGE_KEY = 'bloom.settings.v1';

export type PersistedState = {
  favorites?: FavoritesState;
  settings?: SettingsState;
};

/**
 * The slices this module persists, described structurally rather than imported from `store`.
 *
 * `store` imports this module to install the middleware, so importing `RootState` back from it
 * would be a cycle — and a type cycle does not fail loudly, it silently degrades `RootState` to
 * `any` and takes every selector's inference down with it.
 */
type PersistedRootState = {
  favorites: FavoritesState;
  settings: SettingsState;
};

async function readJson<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);

    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    // A corrupt or unreadable entry must not stop the app from starting; the user loses that
    // slice's saved state, which is recoverable, rather than the app failing to launch.
    return undefined;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persisting is best effort. Surfacing a write failure would interrupt the action the user
    // actually took (hearting a plant, flipping a switch), which still succeeded in memory.
  }
}

/** Reads both saved slices. Returns `{}` on a first run, and `hydrateStore` then dispatches
 * nothing — the store keeps the defaults each slice declared. Restoration is by dispatch rather
 * than `preloadedState` because the read is async and `configureStore` needs its state up front. */
export async function loadPersistedState(): Promise<PersistedState> {
  const [favorites, settings] = await Promise.all([
    readJson<FavoritesState>(FAVORITES_STORAGE_KEY),
    readJson<SettingsState>(SETTINGS_STORAGE_KEY),
  ]);

  return { ...(favorites ? { favorites } : {}), ...(settings ? { settings } : {}) };
}

/**
 * Writes a slice back whenever one of its own actions lands.
 *
 * Listening to specific actions rather than subscribing to every state change keeps unrelated
 * dispatches from causing a write, and keeps each slice's storage key independent — a change to
 * how settings are shaped cannot invalidate someone's saved favorites.
 */
/** The settings worth keeping between launches, listed rather than spread.
 *
 * `isHydrated` is deliberately absent: it describes this launch, not the user's choices, and
 * restoring it would announce "already hydrated" on the next cold start before anything had been
 * read. Naming each field means a future setting has to be added here consciously, rather than
 * being persisted by accident. */
function toPersistableSettings(settings: SettingsState): Omit<SettingsState, 'isHydrated'> {
  return {
    autoDetectLocation: settings.autoDetectLocation,
    darkTheme: settings.darkTheme,
    detectedLocation: settings.detectedLocation,
    followSystemTheme: settings.followSystemTheme,
    hasAnsweredLocationPrompt: settings.hasAnsweredLocationPrompt,
    recentLocations: settings.recentLocations,
    selectedLocation: settings.selectedLocation,
    weatherAdjustmentEnabled: settings.weatherAdjustmentEnabled,
  };
}

export const persistenceMiddleware = createListenerMiddleware<PersistedRootState>();

persistenceMiddleware.startListening({
  matcher: isAnyOf(addFavorite, removeFavorite, toggleFavorite),
  effect: async (_action, api) => {
    await writeJson(FAVORITES_STORAGE_KEY, api.getState().favorites);
  },
});

persistenceMiddleware.startListening({
  matcher: isAnyOf(
    answerLocationPrompt,
    setAutoDetectLocation,
    setDarkTheme,
    setDetectedLocation,
    setFollowSystemTheme,
    setSelectedLocation,
    setWeatherAdjustmentEnabled,
  ),
  effect: async (_action, api) => {
    await writeJson(SETTINGS_STORAGE_KEY, toPersistableSettings(api.getState().settings));
  },
});
