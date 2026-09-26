import { searchSpecies } from '../../../services/plantApi';
import type { PerenualSpeciesListItem } from '../../../services/types';


import {
  clearSpeciesSearchCache,
  mergeSearchResults,
  rankByRelevance,
  searchSeedSpecies,
  searchSpeciesByRelevance,
} from './speciesSearch';

jest.mock('../../../services/plantApi');

const mockedSearchSpecies = searchSpecies as jest.MockedFunction<typeof searchSpecies>;

function buildItem(overrides: Partial<PerenualSpeciesListItem> = {}): PerenualSpeciesListItem {
  return {
    common_name: 'Test Plant',
    default_image: null,
    id: 1,
    scientific_name: ['Testus plantus'],
    ...overrides,
  };
}

const SCIENTIFIC_NAME_RANK = 2;

describe('rankByRelevance', () => {
  it('ranks a common-name starts-with match highest', () => {
    const item = buildItem({ common_name: 'Parlor Palm' });
    expect(rankByRelevance(item, 'parlor')).toBe(0);
  });

  it('ranks a common-name word-boundary match second', () => {
    const item = buildItem({ common_name: 'Prayer Plant' });
    expect(rankByRelevance(item, 'plant')).toBe(1);
  });

  it('matches a genus search against the scientific name even when the common name is unrelated-looking', () => {
    // Real Perenual data: id 5159, common_name "prayer plant", scientific_name Maranta leuconeura.
    const item = buildItem({
      common_name: 'prayer plant',
      scientific_name: ['Maranta leuconeura var. erythroneura'],
    });
    expect(rankByRelevance(item, 'maranta')).toBe(SCIENTIFIC_NAME_RANK);
  });

  it('does not match a query that is only a substring/prefix of a scientific-name word, not the whole word', () => {
    // Real regression case: "Palm" search must not match "Acer palmatum" (Japanese Maple) —
    // "palm" is a prefix of "palmatum", not equal to it.
    const item = buildItem({ common_name: 'Japanese Maple', scientific_name: ['Acer palmatum'] });
    expect(rankByRelevance(item, 'palm')).toBeNull();
  });

  it('strips punctuation from scientific-name tokens before comparing', () => {
    const item = buildItem({
      common_name: 'red-veined prayer plant',
      scientific_name: ["Maranta leuconeura 'Erythroneura'"],
    });
    expect(rankByRelevance(item, 'erythroneura')).toBe(SCIENTIFIC_NAME_RANK);
  });

  it('returns null for a plain coincidental substring match in the common name', () => {
    // "Japanese" contains "pa" mid-word ("ja-pa-nese"), with no word boundary and no scientific
    // name relevance — should not match at all.
    const item = buildItem({ common_name: 'Japanese Maple', scientific_name: ['Acer palmatum'] });
    expect(rankByRelevance(item, 'pa')).toBeNull();
  });
});

describe('searchSeedSpecies', () => {
  it('matches a seed species by prefix', () => {
    expect(searchSeedSpecies('zz')).toEqual([
      { speciesId: 'zz-plant', speciesName: 'ZZ plant' },
    ]);
  });

  it('matches every seed species sharing a prefix', () => {
    const names = searchSeedSpecies('zebra').map(result => result.speciesName);
    expect(names).toEqual(expect.arrayContaining(['Zebra Haworthia', 'Zebra Cactus']));
  });

  it('matches a word that starts later in the name', () => {
    const names = searchSeedSpecies('palm').map(result => result.speciesName);
    expect(names).toContain('Parlor Palm');
  });

  it('returns nothing for a blank query', () => {
    expect(searchSeedSpecies('   ')).toEqual([]);
  });

  it('returns nothing when no seed species matches', () => {
    expect(searchSeedSpecies('fiddle leaf fig')).toEqual([]);
  });
});

describe('mergeSearchResults', () => {
  const seed = [{ speciesId: 'zz-plant', speciesName: 'ZZ plant' }];

  it('keeps seed results first', () => {
    const merged = mergeSearchResults(seed, [
      { speciesId: '404', speciesName: 'Zamioculcas' },
    ]);
    expect(merged.map(result => result.speciesId)).toEqual(['zz-plant', '404']);
  });

  it('drops a remote duplicate of a seed species', () => {
    // The same plant carries a seed slug locally and a Perenual number remotely, so the ids can
    // never match even though the rows are the same plant — dedup has to be by name.
    const merged = mergeSearchResults(seed, [
      { speciesId: '501', speciesName: 'zz plant' },
    ]);
    expect(merged).toEqual(seed);
  });

  it('returns remote results unchanged when there are no seed matches', () => {
    const remote = [{ speciesId: '501', speciesName: 'Fiddle Leaf Fig' }];
    expect(mergeSearchResults([], remote)).toEqual(remote);
  });
});

describe('searchSpeciesByRelevance', () => {
  beforeEach(() => {
    clearSpeciesSearchCache();
    mockedSearchSpecies.mockReset();
  });

  it('normalizes the query before ranking and before calling the API', async () => {
    mockedSearchSpecies.mockResolvedValue([buildItem({ common_name: 'Parlor Palm', id: 7 })]);

    // Untrimmed and uppercased: rankByRelevance assumes normalized input, so without
    // normalization here 'Parlor Palm' would fail to match its own name.
    await expect(searchSpeciesByRelevance('  PARLOR  ')).resolves.toEqual([
      { speciesId: '7', speciesName: 'Parlor Palm' },
    ]);
    expect(mockedSearchSpecies).toHaveBeenCalledWith('parlor');
  });

  it('serves a repeated query from the cache without calling the API again', async () => {
    mockedSearchSpecies.mockResolvedValue([buildItem({ common_name: 'Parlor Palm', id: 7 })]);

    await searchSpeciesByRelevance('parlor');
    await searchSpeciesByRelevance('parlor');

    expect(mockedSearchSpecies).toHaveBeenCalledTimes(1);
  });

  it('treats differently-spelled forms of one query as the same cache entry', async () => {
    mockedSearchSpecies.mockResolvedValue([buildItem({ common_name: 'Parlor Palm', id: 7 })]);

    await searchSpeciesByRelevance('parlor');
    await searchSpeciesByRelevance('  Parlor ');

    expect(mockedSearchSpecies).toHaveBeenCalledTimes(1);
  });
});
