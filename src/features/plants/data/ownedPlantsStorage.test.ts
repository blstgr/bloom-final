import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadOwnedPlants, saveOwnedPlants } from './ownedPlantsStorage';
import type { OwnedPlant } from './types';

const mockedStorage = AsyncStorage as unknown as {
  __reset: () => void;
  getItem: jest.Mock;
  setItem: jest.Mock;
};

const ownedPlant = {
  addedAt: '2026-01-01T00:00:00.000Z',
  customName: 'Kevin',
  image: 1,
  ownedPlantId: 'owned-plant-0',
  speciesId: 'zz-plant',
  wateringHistory: ['2026-09-20T09:00:00.000Z'],
} as unknown as OwnedPlant;

beforeEach(() => {
  mockedStorage.__reset();
  mockedStorage.getItem.mockClear();
  mockedStorage.setItem.mockClear();
});

describe('owned plants storage', () => {
  it('reads back exactly what was written, watering history included', async () => {
    await saveOwnedPlants([ownedPlant]);

    await expect(loadOwnedPlants()).resolves.toEqual([ownedPlant]);
  });

  it('reports nothing saved on a first run', async () => {
    await expect(loadOwnedPlants()).resolves.toBeNull();
  });

  it('distinguishes a deliberately empty list from nothing saved', async () => {
    // The user deleting their last plant must not silently restore the seed data next launch.
    await saveOwnedPlants([]);

    await expect(loadOwnedPlants()).resolves.toEqual([]);
  });

  it('rejects a stored value that is not a list', async () => {
    await AsyncStorage.setItem('bloom.ownedPlants.v1', JSON.stringify({ notAnArray: true }));

    await expect(loadOwnedPlants()).resolves.toBeNull();
  });

  it('survives an unparseable entry', async () => {
    await AsyncStorage.setItem('bloom.ownedPlants.v1', '{{{');

    await expect(loadOwnedPlants()).resolves.toBeNull();
  });

  it('does not throw when storage refuses the write', async () => {
    mockedStorage.setItem.mockRejectedValueOnce(new Error('disk full'));

    await expect(saveOwnedPlants([ownedPlant])).resolves.toBeUndefined();
  });
});
