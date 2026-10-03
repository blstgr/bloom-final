import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { GeoLocation } from '../services/types';
import type { ThemeMode } from '../theme';

import { pushRecentItem } from './recentItems';
import type { RootState } from './store';

export type SettingsState = {
  /** False until the saved settings have been read back. Consumers that would act on a setting —
   * fetching a forecast, deciding whether to detect a location — must wait for this, or they act
   * on defaults that the very next tick replaces. Not persisted: it describes this launch. */
  isHydrated: boolean;
  /** When on, the location comes from the device's timezone rather than a chosen city. */
  autoDetectLocation: boolean;
  detectedLocation: GeoLocation | null;
  /** The theme chosen in Settings, consulted only while `followSystemTheme` is off. */
  darkTheme: boolean;
  /** When on, the theme follows the system appearance and `darkTheme` is ignored. */
  followSystemTheme: boolean;
  /** Whether the user has answered the location explainer shown after sign-in. Detection waits
   * for it, so the system permission dialog never appears before the explanation. */
  hasAnsweredLocationPrompt: boolean;
  /** Cities chosen in city search, newest first — the search's "Recent searches" section. */
  recentLocations: GeoLocation[];
  /** Only consulted while `autoDetectLocation` is off, and re-seeded from `detectedLocation`
   * every time detection is switched off — so turning it off always freezes the city that was
   * showing, never one searched for in an earlier session. */
  selectedLocation: GeoLocation | null;
  weatherAdjustmentEnabled: boolean;
};

// Both default on: the feature is the point of the screen, and a user whose home is climate
// controlled can turn it off once rather than every user having to find it.
const initialState: SettingsState = {
  autoDetectLocation: true,
  isHydrated: false,
  darkTheme: false,
  detectedLocation: null,
  followSystemTheme: true,
  hasAnsweredLocationPrompt: false,
  recentLocations: [],
  selectedLocation: null,
  weatherAdjustmentEnabled: true,
};


const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /** The explainer's two answers: allow detection, or pick a city by hand instead. */
    answerLocationPrompt: (state, action: PayloadAction<{ allowDetection: boolean }>) => {
      state.hasAnsweredLocationPrompt = true;
      state.autoDetectLocation = action.payload.allowDetection;
    },
    /** Merges what was read from storage over the defaults, so a saved file written before a new
     * setting existed still starts that setting at its default rather than undefined. Not matched
     * by the persistence listener, so restoring cannot trigger a write back. */
    hydrateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      Object.assign(state, action.payload);
      state.isHydrated = true;
    },
    setAutoDetectLocation: (state, action: PayloadAction<boolean>) => {
      state.autoDetectLocation = action.payload;
      // Switching detection off keeps the city that was on screen a moment ago. It takes the
      // detected one each time rather than only the first, because the alternative surfaces a
      // city the user searched for once, long ago: detect on (Kyiv) -> off would show London
      // because London was typed in last week. "Stop updating this" should freeze what is
      // showing, not resurrect history.
      if (!action.payload && state.detectedLocation) {
        state.selectedLocation = state.detectedLocation;
      }
    },
    setDarkTheme: (state, action: PayloadAction<boolean>) => {
      state.darkTheme = action.payload;
    },
    /** Turning "follow system" off keeps the theme that was showing — `systemIsDark` is the
     * appearance the app was following — so the screen does not flip the moment the switch moves. */
    setFollowSystemTheme: (
      state,
      action: PayloadAction<{ follow: boolean; systemIsDark: boolean }>,
    ) => {
      state.followSystemTheme = action.payload.follow;
      if (!action.payload.follow) state.darkTheme = action.payload.systemIsDark;
    },
    setDetectedLocation: (state, action: PayloadAction<GeoLocation | null>) => {
      state.detectedLocation = action.payload;
    },
    setSelectedLocation: (state, action: PayloadAction<GeoLocation>) => {
      state.selectedLocation = action.payload;
      state.recentLocations = pushRecentItem(state.recentLocations, action.payload, location => location.locationId);
      // Choosing a city is itself the decision to stop detecting one.
      state.autoDetectLocation = false;
    },
    setWeatherAdjustmentEnabled: (state, action: PayloadAction<boolean>) => {
      state.weatherAdjustmentEnabled = action.payload;
    },
  },
});

export const {
  answerLocationPrompt,
  hydrateSettings,
  setAutoDetectLocation,
  setDarkTheme,
  setDetectedLocation,
  setFollowSystemTheme,
  setSelectedLocation,
  setWeatherAdjustmentEnabled,
} = settingsSlice.actions;

/**
 * The location the forecast should actually be fetched for, or null when there is none yet.
 *
 * Null is a real state, not an error: detection can fail, and a user who turned detection off
 * before choosing a city has no location at all. Callers render an unresolved state rather than
 * guessing a city.
 */
export function selectActiveLocation(state: RootState): GeoLocation | null {
  const { autoDetectLocation, detectedLocation, selectedLocation } = state.settings;

  return autoDetectLocation ? detectedLocation : selectedLocation;
}

export function selectWeatherAdjustmentEnabled(state: RootState): boolean {
  return state.settings.weatherAdjustmentEnabled;
}

export function selectIsSettingsHydrated(state: RootState): boolean {
  return state.settings.isHydrated;
}

export default settingsSlice.reducer;

/** Which theme applies: the system appearance while following it, the chosen one otherwise. */
export function selectThemeMode(state: RootState, systemIsDark: boolean): ThemeMode {
  const { darkTheme, followSystemTheme } = state.settings;
  const isDark = followSystemTheme ? systemIsDark : darkTheme;

  return isDark ? 'dark' : 'light';
}
