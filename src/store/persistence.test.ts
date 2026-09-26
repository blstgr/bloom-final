import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadPersistedState } from './persistence';

const mockedStorage = AsyncStorage as unknown as {
  __reset: () => void;
  getItem: jest.Mock;
  setItem: jest.Mock;
};

const FAVORITES_KEY = 'bloom.favorites.v1';
const SETTINGS_KEY = 'bloom.settings.v1';

beforeEach(() => {
  mockedStorage.__reset();
  mockedStorage.getItem.mockClear();
});

describe('loadPersistedState', () => {
  it('reads nothing on a first run, so each slice keeps its own defaults', async () => {
    await expect(loadPersistedState()).resolves.toEqual({});
  });

  it('round-trips a saved favorites list', async () => {
    const favorites = [
      { addedAt: '2026-01-01T00:00:00.000Z', image: 1, speciesId: 'zz-plant', speciesName: 'ZZ plant' },
    ];
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

    await expect(loadPersistedState()).resolves.toEqual({ favorites });
  });

  it('round-trips saved settings', async () => {
    const settings = {
      autoDetectLocation: false,
      detectedLocation: null,
      selectedLocation: {
        country: 'United Kingdom',
        latitude: 51.51,
        locationId: '2643743',
        longitude: -0.13,
        name: 'London',
        timezone: 'Europe/London',
      },
      weatherAdjustmentEnabled: true,
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    await expect(loadPersistedState()).resolves.toEqual({ settings });
  });

  it('survives a corrupt entry rather than failing the launch', async () => {
    await AsyncStorage.setItem(FAVORITES_KEY, 'not json at all');

    await expect(loadPersistedState()).resolves.toEqual({});
  });

  it('keeps the readable slice when only the other one is corrupt', async () => {
    const favorites = [
      { addedAt: '2026-01-01T00:00:00.000Z', image: 1, speciesId: 'zz-plant', speciesName: 'ZZ plant' },
    ];
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    await AsyncStorage.setItem(SETTINGS_KEY, '{ broken');

    await expect(loadPersistedState()).resolves.toEqual({ favorites });
  });

  it('survives storage itself throwing', async () => {
    mockedStorage.getItem.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(loadPersistedState()).resolves.toEqual({});
  });
});
