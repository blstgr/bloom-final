import AsyncStorage from '@react-native-async-storage/async-storage';

import { noPlantPhoto } from './noPlantPhoto';
import { loadSpeciesCache, saveSpeciesCache } from './speciesCacheStorage';
import type { PlantSpecies } from './types';

const mockedStorage = AsyncStorage as unknown as { __reset: () => void };

function species(speciesId: string, image: PlantSpecies['image'] = { uri: `https://example.com/${speciesId}.jpg` }): PlantSpecies {
  return {
    category: 'Independent roommate',
    description: 'Likes bright indirect light.',
    detailImage: image,
    detailImageUrl: '',
    image,
    isToxicToPets: false,
    lightNeed: 'bright',
    speciesId,
    speciesName: 'ZZ plant',
    wateringIntervalDays: 14,
    wikiArticle: 'One.\n\nTwo.\n\nThree.\n\nFour.',
  };
}

beforeEach(() => mockedStorage.__reset());

describe('species cache storage', () => {
  it('reads back what was written, article included, in the same order', async () => {
    await saveSpeciesCache([species('42'), species('7')]);

    expect(await loadSpeciesCache()).toEqual([species('42'), species('7')]);
  });

  it('swaps a bundled image for the no-photo placeholder, since module numbers change between builds', async () => {
    // The placeholder itself is a bundled image; any other module number stands for a stale one.
    const STALE_MODULE_ID = 999;
    await saveSpeciesCache([species('42', STALE_MODULE_ID)]);

    const [stored] = await loadSpeciesCache();
    expect(stored.image).toBe(noPlantPhoto);
    expect(stored.detailImage).toBe(noPlantPhoto);
  });

  it('drops entries of the wrong shape and survives unreadable data', async () => {
    await AsyncStorage.setItem('bloom.speciesCache.v2', JSON.stringify([species('42'), { speciesId: 7 }, null]));
    expect((await loadSpeciesCache()).map(entry => entry.speciesId)).toEqual(['42']);

    await AsyncStorage.setItem('bloom.speciesCache.v2', '{not json');
    expect(await loadSpeciesCache()).toEqual([]);
  });
});
