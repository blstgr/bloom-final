import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSpeciesCache, MAX_STORED_SPECIES } from './speciesCache';
import { loadSpeciesCache, saveSpeciesCache } from './speciesCacheStorage';
import type { PlantSpecies } from './types';

const mockedStorage = AsyncStorage as unknown as { __reset: () => void };

function species(speciesId: string): PlantSpecies {
  return {
    category: 'Independent roommate',
    description: 'Likes bright indirect light.',
    detailImage: { uri: `https://example.com/${speciesId}.jpg` },
    detailImageUrl: `https://example.com/${speciesId}.jpg`,
    image: { uri: `https://example.com/${speciesId}.jpg` },
    isToxicToPets: false,
    lightNeed: 'bright',
    speciesId,
    speciesName: 'ZZ plant',
    wateringIntervalDays: 14,
    wikiArticle: 'One.\n\nTwo.\n\nThree.\n\nFour.',
  };
}

/** A full stored cache, most recently opened first: '0' is newest, the last id is oldest. */
async function storeFullCache(): Promise<string[]> {
  const ids = Array.from({ length: MAX_STORED_SPECIES }, (_, index) => String(index));
  await saveSpeciesCache(ids.map(species));
  return ids;
}

async function storedIds(): Promise<string[]> {
  return (await loadSpeciesCache()).map(entry => entry.speciesId);
}

beforeEach(() => mockedStorage.__reset());

describe('species cache', () => {
  it(`keeps only the ${MAX_STORED_SPECIES} most recently opened`, async () => {
    const cache = createSpeciesCache();
    await cache.hydrate();

    Array.from({ length: MAX_STORED_SPECIES + 1 }, (_, index) => cache.add(species(String(index))));

    const stored = await storedIds();
    expect(stored).toHaveLength(MAX_STORED_SPECIES);
    expect(stored[0]).toBe(String(MAX_STORED_SPECIES));
    expect(stored).not.toContain('0');
  });

  it('does not save before the stored cache is read back', async () => {
    const ids = await storeFullCache();
    const cache = createSpeciesCache();

    cache.add(species('new'));

    expect(await storedIds()).toEqual(ids);
  });

  it('saves a plant added during the read even when the stored cache is already full', async () => {
    const ids = await storeFullCache();
    const cache = createSpeciesCache();

    const hydration = cache.hydrate();
    cache.add(species('new'));
    expect(await hydration).toBe(true);

    expect(await storedIds()).toEqual(['new', ...ids.slice(0, -1)]);
  });

  it('keeps a reopened plant over one opened more recently the first time', async () => {
    const ids = await storeFullCache();
    const oldest = ids[ids.length - 1];
    const cache = createSpeciesCache();
    await cache.hydrate();

    cache.markOpened(oldest);
    cache.add(species('new'));

    const stored = await storedIds();
    expect(stored.slice(0, 2)).toEqual(['new', oldest]);
    expect(stored).not.toContain(ids[ids.length - 2]);
  });

  it('ignores opening a plant it does not hold', async () => {
    const ids = await storeFullCache();
    const cache = createSpeciesCache();
    await cache.hydrate();

    cache.markOpened('shipped-monstera');

    expect(await storedIds()).toEqual(ids);
    expect(cache.get('shipped-monstera')).toBeUndefined();
  });

  it('shares one read across repeated hydrate calls and keeps an entry added during it', async () => {
    await saveSpeciesCache([{ ...species('42'), speciesName: 'Stored' }]);
    const cache = createSpeciesCache();

    const first = cache.hydrate();
    cache.add({ ...species('42'), speciesName: 'Fresh' });

    expect(cache.hydrate()).toBe(first);
    expect(await first).toBe(false);
    expect(cache.get('42')?.speciesName).toBe('Fresh');
  });
});
