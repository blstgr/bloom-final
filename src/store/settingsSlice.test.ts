import type { GeoLocation } from '../services/types';

import settingsReducer, {
  hydrateSettings,
  selectActiveLocation,
  setAutoDetectLocation,
  setSelectedLocation,
  setWeatherAdjustmentEnabled,
  type SettingsState,
} from './settingsSlice';

const kyiv: GeoLocation = {
  country: 'Ukraine',
  latitude: 50.45,
  locationId: '703448',
  longitude: 30.52,
  name: 'Kyiv',
  timezone: 'Europe/Kyiv',
};

const london: GeoLocation = {
  country: 'United Kingdom',
  latitude: 51.51,
  locationId: '2643743',
  longitude: -0.13,
  name: 'London',
  timezone: 'Europe/London',
};

function buildState(overrides: Partial<SettingsState> = {}): SettingsState {
  return {
    autoDetectLocation: true,
    isHydrated: true,
    detectedLocation: null,
    selectedLocation: null,
    weatherAdjustmentEnabled: true,
    ...overrides,
  };
}

describe('settingsSlice', () => {
  it('starts with both switches on, no location known, and unhydrated', () => {
    expect(settingsReducer(undefined, { type: '@@INIT' })).toEqual(
      buildState({ isHydrated: false }),
    );
  });

  it('marks itself hydrated even when nothing was saved', () => {
    // A first run has no settings to restore but still has to announce the read finished, or
    // consumers wait forever for state that is never coming.
    const state = settingsReducer(settingsReducer(undefined, { type: '@@INIT' }), hydrateSettings({}));

    expect(state.isHydrated).toBe(true);
  });

  it('turns the weather adjustment off without discarding the location', () => {
    const state = settingsReducer(
      buildState({ detectedLocation: kyiv }),
      setWeatherAdjustmentEnabled(false),
    );

    expect(state.weatherAdjustmentEnabled).toBe(false);
    expect(state.detectedLocation).toEqual(kyiv);
  });

  it('choosing a city also stops detecting one', () => {
    const state = settingsReducer(buildState(), setSelectedLocation(london));

    expect(state.selectedLocation).toEqual(london);
    expect(state.autoDetectLocation).toBe(false);
  });

  it('keeps the detected city when detection is switched off', () => {
    // Switching off means "stop updating this", not "forget where I am".
    const detected = buildState({ detectedLocation: kyiv });
    const frozen = settingsReducer(detected, setAutoDetectLocation(false));

    expect(frozen.selectedLocation).toEqual(kyiv);
  });

  it('does not overwrite a city the user chose themselves', () => {
    const chosen = settingsReducer(
      buildState({ detectedLocation: kyiv }),
      setSelectedLocation(london),
    );
    const toggled = settingsReducer(
      settingsReducer(chosen, setAutoDetectLocation(true)),
      setAutoDetectLocation(false),
    );

    expect(toggled.selectedLocation).toEqual(london);
  });

  it('keeps the chosen city when detection is switched back on', () => {
    const chosen = settingsReducer(buildState(), setSelectedLocation(london));
    const redetected = settingsReducer(chosen, setAutoDetectLocation(true));

    expect(redetected.selectedLocation).toEqual(london);
  });
});

describe('selectActiveLocation', () => {
  function buildRootState(settings: SettingsState) {
    return { favorites: [], settings };
  }

  it('prefers the detected location while detection is on', () => {
    const state = buildRootState(
      buildState({ detectedLocation: kyiv, selectedLocation: london }),
    );

    expect(selectActiveLocation(state)).toEqual(kyiv);
  });

  it('switches to the chosen city the moment detection is off', () => {
    const state = buildRootState(
      buildState({ autoDetectLocation: false, detectedLocation: kyiv, selectedLocation: london }),
    );

    expect(selectActiveLocation(state)).toEqual(london);
  });

  it('is null when detection is off and there was never a location at all', () => {
    const state = buildRootState(buildState({ autoDetectLocation: false }));

    expect(selectActiveLocation(state)).toBeNull();
  });

  it('is null before detection has resolved', () => {
    expect(selectActiveLocation(buildRootState(buildState()))).toBeNull();
  });
});
