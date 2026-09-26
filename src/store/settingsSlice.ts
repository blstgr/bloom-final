import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { GeoLocation } from '../services/types';

import type { RootState } from './store';

export type SettingsState = {
  /** When on, the location comes from the device's timezone rather than a chosen city. */
  autoDetectLocation: boolean;
  detectedLocation: GeoLocation | null;
  /** Only consulted while `autoDetectLocation` is off. Kept rather than cleared when detection
   * is switched back on, so turning it off again restores the user's own choice. */
  selectedLocation: GeoLocation | null;
  weatherAdjustmentEnabled: boolean;
};

// Both default on: the feature is the point of the screen, and a user whose home is climate
// controlled can turn it off once rather than every user having to find it.
const initialState: SettingsState = {
  autoDetectLocation: true,
  detectedLocation: null,
  selectedLocation: null,
  weatherAdjustmentEnabled: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setAutoDetectLocation: (state, action: PayloadAction<boolean>) => {
      state.autoDetectLocation = action.payload;
    },
    setDetectedLocation: (state, action: PayloadAction<GeoLocation | null>) => {
      state.detectedLocation = action.payload;
    },
    setSelectedLocation: (state, action: PayloadAction<GeoLocation>) => {
      state.selectedLocation = action.payload;
      // Choosing a city is itself the decision to stop detecting one.
      state.autoDetectLocation = false;
    },
    setWeatherAdjustmentEnabled: (state, action: PayloadAction<boolean>) => {
      state.weatherAdjustmentEnabled = action.payload;
    },
  },
});

export const {
  setAutoDetectLocation,
  setDetectedLocation,
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

export default settingsSlice.reducer;
