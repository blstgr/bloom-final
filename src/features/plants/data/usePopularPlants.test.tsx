import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { Provider as StoreProvider } from 'react-redux';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { GeoLocation, LocationClimate } from '../../../services/types';
import { getLocationClimate } from '../../../services/weatherApi';
import settingsReducer, { hydrateSettings, setSelectedLocation } from '../../../store/settingsSlice';

import { NO_LOCATION_PLANT_COUNT } from './popularPlantRanking';
import { POPULAR_PLANTS } from './popularPlants';
import { clearClimateCache, usePopularPlants } from './usePopularPlants';

const mockedGetLocationClimate = jest.mocked(getLocationClimate);

const KYIV: GeoLocation = {
  country: 'Ukraine',
  latitude: 50.45,
  locationId: '703448',
  longitude: 30.52,
  name: 'Kyiv',
  timezone: 'Europe/Kyiv',
};
const LONDON: GeoLocation = {
  country: 'United Kingdom',
  latitude: 51.51,
  locationId: '2643743',
  longitude: -0.13,
  name: 'London',
  timezone: 'Europe/London',
};
const CLIMATE: LocationClimate = { annualMinimumsC: [-20, -15, -16], humidityMean: 72, latitude: 50.45 };

function renderWithCity(city: GeoLocation, { weatherAdjustmentEnabled = true } = {}) {
  const store = configureStore({ reducer: { settings: settingsReducer } });
  store.dispatch(
    hydrateSettings({ autoDetectLocation: false, selectedLocation: city, weatherAdjustmentEnabled }),
  );
  const result = { current: [] as ReturnType<typeof usePopularPlants> };
  function Probe() {
    result.current = usePopularPlants();
    return null;
  }
  act(() => {
    ReactTestRenderer.create(
      <StoreProvider store={store}>
        <Probe />
      </StoreProvider>,
    );
  });

  return { result, store };
}

describe('usePopularPlants', () => {
  beforeEach(() => {
    clearClimateCache();
    mockedGetLocationClimate.mockReset();
  });

  it('shows the top ten and asks for no climate while the weather feature is off', () => {
    mockedGetLocationClimate.mockResolvedValue(CLIMATE);
    const { result } = renderWithCity(KYIV, { weatherAdjustmentEnabled: false });

    expect(result.current).toHaveLength(NO_LOCATION_PLANT_COUNT);
    expect(mockedGetLocationClimate).not.toHaveBeenCalled();
  });

  it('drops to the top ten while a new place loads, not the last place\'s ranking', async () => {
    mockedGetLocationClimate.mockResolvedValueOnce(CLIMATE);
    const { result, store } = renderWithCity(KYIV);
    await act(async () => {});
    expect(result.current).toHaveLength(POPULAR_PLANTS.length);

    let resolveLondon: (climate: LocationClimate) => void = () => undefined;
    mockedGetLocationClimate.mockImplementationOnce(
      () => new Promise(resolve => { resolveLondon = resolve; }),
    );
    act(() => {
      store.dispatch(setSelectedLocation(LONDON));
    });
    expect(result.current).toHaveLength(NO_LOCATION_PLANT_COUNT);

    await act(async () => {
      resolveLondon({ ...CLIMATE, latitude: LONDON.latitude });
    });
    expect(result.current).toHaveLength(POPULAR_PLANTS.length);
  });
});
