import type { GeoLocation } from '../services/types';

import { MAX_RECENT_ITEMS } from './recentItems';
import settingsReducer, {
  answerLocationPrompt,
  setFollowSystemTheme,
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
    darkTheme: false,
    detectedLocation: null,
    followSystemTheme: true,
    hasAnsweredLocationPrompt: false,
    recentLocations: [],
    selectedLocation: null,
    weatherAdjustmentEnabled: true,
    ...overrides,
  };
}

describe('settingsSlice', () => {
  it('turning off "follow system" keeps the appearance that was showing', () => {
    const fromDark = settingsReducer(buildState(), setFollowSystemTheme({ follow: false, systemIsDark: true }));
    const fromLight = settingsReducer(buildState(), setFollowSystemTheme({ follow: false, systemIsDark: false }));

    expect(fromDark).toMatchObject({ darkTheme: true, followSystemTheme: false });
    expect(fromLight).toMatchObject({ darkTheme: false, followSystemTheme: false });
  });

  it('records a chosen city as the most recent, without duplicates', () => {
    let state = settingsReducer(buildState(), setSelectedLocation(kyiv));
    state = settingsReducer(state, setSelectedLocation(london));
    state = settingsReducer(state, setSelectedLocation(kyiv));

    expect(state.recentLocations.map(location => location.name)).toEqual(['Kyiv', 'London']);
  });

  it('keeps only the most recent few cities', () => {
    const cities = Array.from({ length: MAX_RECENT_ITEMS + 2 }, (_, index) => ({
      ...kyiv,
      locationId: `city-${index}`,
      name: `City ${index}`,
    }));
    const state = cities.reduce(
      (current, city) => settingsReducer(current, setSelectedLocation(city)),
      buildState(),
    );

    expect(state.recentLocations).toHaveLength(MAX_RECENT_ITEMS);
    expect(state.recentLocations[0].name).toBe(`City ${MAX_RECENT_ITEMS + 1}`);
  });

  it('answering the location prompt records the answer and the detection choice', () => {
    const allowed = settingsReducer(buildState(), answerLocationPrompt({ allowDetection: true }));
    const declined = settingsReducer(buildState(), answerLocationPrompt({ allowDetection: false }));

    expect(allowed).toMatchObject({ autoDetectLocation: true, hasAnsweredLocationPrompt: true });
    expect(declined).toMatchObject({ autoDetectLocation: false, hasAnsweredLocationPrompt: true });
  });

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

  it('freezes the city currently showing, not one searched for earlier', () => {
    // London was chosen at some point; detection was then switched back on and found Kyiv.
    // Switching off again must keep Kyiv — what is on screen — rather than resurrect London.
    const chosen = settingsReducer(
      buildState({ detectedLocation: kyiv }),
      setSelectedLocation(london),
    );
    const redetecting = settingsReducer(chosen, setAutoDetectLocation(true));
    const frozen = settingsReducer(redetecting, setAutoDetectLocation(false));

    expect(frozen.selectedLocation).toEqual(kyiv);
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
