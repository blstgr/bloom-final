import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { act, create } from 'react-test-renderer';

import { getSpeciesDetails, PlantApiError, searchSpecies } from '../../../services/plantApi';
import { generateSpeciesCopy, PlantCopyApiError } from '../../../services/plantCopyApi';
import { identifyPlant, PlantIdApiError } from '../../../services/plantIdApi';
import type { PerenualSpeciesDetails, PerenualSpeciesListItem } from '../../../services/types';
import { searchPhoto } from '../../../services/unsplashApi';

import {
  PlantDataProvider,
  usePlantData,
  type PlantDataContextValue,
  type SpeciesLookupResult,
} from './PlantDataProvider';
import type { PlantSpecies } from './types';

// Factory mocks (not bare jest.mock automocks) so PlantApiError/PlantIdApiError/PlantCopyApiError
// keep their real constructors — automocking them would strip the `this.kind = kind` assignment,
// breaking the provider's `error instanceof X && error.kind === '...'` checks under test.
jest.mock('../../../services/plantApi', () => ({
  ...jest.requireActual('../../../services/plantApi'),
  getSpeciesDetails: jest.fn(),
  searchSpecies: jest.fn(),
}));
jest.mock('../../../services/plantIdApi', () => ({
  ...jest.requireActual('../../../services/plantIdApi'),
  identifyPlant: jest.fn(),
}));
jest.mock('../../../services/plantCopyApi', () => ({
  ...jest.requireActual('../../../services/plantCopyApi'),
  generateSpeciesCopy: jest.fn(),
}));
jest.mock('../../../services/unsplashApi');

const mockSearchSpecies = searchSpecies as jest.MockedFunction<typeof searchSpecies>;
const mockGetSpeciesDetails = getSpeciesDetails as jest.MockedFunction<typeof getSpeciesDetails>;
const mockGenerateSpeciesCopy = generateSpeciesCopy as jest.MockedFunction<typeof generateSpeciesCopy>;
const mockSearchPhoto = searchPhoto as jest.MockedFunction<typeof searchPhoto>;
const mockIdentifyPlant = identifyPlant as jest.MockedFunction<typeof identifyPlant>;

const MATCH: PerenualSpeciesListItem = {
  common_name: 'ZZ plant',
  default_image: null,
  id: 42,
  scientific_name: ['Zamioculcas zamiifolia'],
};

const DETAILS: PerenualSpeciesDetails = {
  care_level: 'Moderate',
  common_name: 'ZZ plant',
  default_image: { medium_url: 'https://example.com/zz-medium.jpg', original_url: 'https://example.com/zz.jpg', small_url: '' },
  dimensions: null,
  growth_rate: 'Low',
  id: 42,
  poisonous_to_humans: false,
  poisonous_to_pets: true,
  scientific_name: ['Zamioculcas zamiifolia'],
  sunlight: ['part shade'],
  watering_general_benchmark: { unit: 'days', value: '14' },
};

function TestHarness({ onReady }: { onReady: (value: PlantDataContextValue) => void }) {
  const value = usePlantData();
  onReady(value);
  return null;
}

function renderProvider() {
  let latest!: PlantDataContextValue;
  act(() => {
    create(
      <PlantDataProvider>
        <TestHarness
          onReady={value => {
            latest = value;
          }}
        />
      </PlantDataProvider>,
    );
  });
  return () => latest;
}

async function expectResolvedSpecies(
  getValue: () => PlantDataContextValue,
  perenualId: number,
): Promise<PlantSpecies> {
  const result = await getValue().resolveSpeciesById(perenualId);
  if (!result.success) throw new Error(`Expected successful resolution, got: ${JSON.stringify(result)}`);
  return result.species;
}

describe('PlantDataProvider species caching', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSearchSpecies.mockResolvedValue([MATCH]);
    mockGetSpeciesDetails.mockResolvedValue(DETAILS);
    mockGenerateSpeciesCopy.mockResolvedValue({
      category: 'Independent Roommate',
      description: 'Likes bright indirect light.',
      wikiArticle: 'A longer article.',
    });
  });

  it('only generates copy once per species across repeated resolutions', async () => {
    const getValue = renderProvider();

    let first: PlantSpecies;
    let second: PlantSpecies;
    await act(async () => {
      first = await expectResolvedSpecies(getValue, MATCH.id);
      second = await expectResolvedSpecies(getValue, MATCH.id);
    });

    expect(mockGetSpeciesDetails).toHaveBeenCalledTimes(1);
    expect(mockGenerateSpeciesCopy).toHaveBeenCalledTimes(1);
    expect(first!).toEqual(second!);
    expect(getValue().getSpeciesById('42')).toEqual(first!);
  });

  it('lookupSpeciesByName resolves through the same cache as resolveSpeciesById', async () => {
    const getValue = renderProvider();

    await act(async () => {
      await expectResolvedSpecies(getValue, MATCH.id);
    });

    let byName;
    await act(async () => {
      byName = await getValue().lookupSpeciesByName('ZZ plant');
    });

    expect(mockGenerateSpeciesCopy).toHaveBeenCalledTimes(1);
    expect(byName).toEqual({ species: getValue().getSpeciesById('42'), success: true });
  });

  it('lookupSpeciesByName reports no-perenual-match when the search returns nothing', async () => {
    mockSearchSpecies.mockResolvedValueOnce([]);
    const getValue = renderProvider();

    let result;
    await act(async () => {
      result = await getValue().lookupSpeciesByName('unknown plant');
    });

    expect(result).toEqual({ reason: 'no-perenual-match', success: false });
  });
});

describe('PlantDataProvider stored species', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // resetAllMocks also strips the storage mock's in-memory implementation; give it a fresh one.
    const store = new Map<string, string>();
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null));
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    });
    mockSearchSpecies.mockResolvedValue([MATCH]);
    mockGetSpeciesDetails.mockResolvedValue(DETAILS);
    mockGenerateSpeciesCopy.mockResolvedValue({
      category: 'Independent roommate',
      description: 'Likes bright indirect light.',
      wikiArticle: 'One.\n\nTwo.\n\nThree.\n\nFour.',
    });
  });

  it('brings back a written-up plant in the next session without writing it again', async () => {
    const firstSession = renderProvider();
    let written: PlantSpecies;
    await act(async () => {
      await Promise.resolve();
      written = await expectResolvedSpecies(firstSession, MATCH.id);
    });

    const nextSession = renderProvider();
    await act(async () => {
      await Promise.resolve();
    });

    expect(nextSession().getSpeciesById('42')).toEqual(written!);
    expect(mockGenerateSpeciesCopy).toHaveBeenCalledTimes(1);
  });

  it('identifies an already-stored plant without writing it again', async () => {
    const firstSession = renderProvider();
    let written: PlantSpecies;
    await act(async () => {
      await Promise.resolve();
      written = await expectResolvedSpecies(firstSession, MATCH.id);
    });

    const nextSession = renderProvider();
    let result!: SpeciesLookupResult;
    await act(async () => {
      await Promise.resolve();
      result = await nextSession().lookupSpeciesByName('ZZ plant', { uri: 'file:///captured.jpg' });
    });

    // It has a real photo, so the captured one is not used and the stored species comes back as is.
    expect(result).toEqual({ species: written!, success: true });
    expect(mockGenerateSpeciesCopy).toHaveBeenCalledTimes(1);
  });

  it('moves a reopened stored plant to the front of what is stored', async () => {
    const OLDER_ID = 7;
    const firstSession = renderProvider();
    await act(async () => {
      await Promise.resolve();
      await firstSession().resolveSpeciesById(OLDER_ID, undefined, 'Snake plant');
      await expectResolvedSpecies(firstSession, MATCH.id);
    });

    const nextSession = renderProvider();
    await act(async () => {
      await Promise.resolve();
    });
    act(() => nextSession().markSpeciesOpened(String(OLDER_ID)));

    const stored = JSON.parse((await AsyncStorage.getItem('bloom.speciesCache.v2'))!) as PlantSpecies[];
    expect(stored.map(entry => entry.speciesId)).toEqual([String(OLDER_ID), String(MATCH.id)]);
  });

  it('gives an already-stored plant with no photo the captured one, without the no-photo note', async () => {
    mockGetSpeciesDetails.mockResolvedValue({ ...DETAILS, default_image: null });
    mockSearchPhoto.mockResolvedValue(null);
    const firstSession = renderProvider();
    await act(async () => {
      await Promise.resolve();
      await expectResolvedSpecies(firstSession, MATCH.id);
    });

    const capturedImage = { uri: 'file:///captured.jpg' };
    const nextSession = renderProvider();
    let result!: SpeciesLookupResult;
    await act(async () => {
      await Promise.resolve();
      result = await nextSession().lookupSpeciesByName('ZZ plant', capturedImage);
    });

    expect(result).toEqual({
      species: expect.objectContaining({
        description: 'Likes bright indirect light.',
        image: capturedImage,
        wikiArticle: 'One.\n\nTwo.\n\nThree.\n\nFour.',
      }),
      success: true,
    });
    expect(mockGenerateSpeciesCopy).toHaveBeenCalledTimes(1);
  });

  it('stores a no-photo plant\'s copy as written, and adds the no-photo note only when it is shown', async () => {
    mockGetSpeciesDetails.mockResolvedValue({ ...DETAILS, default_image: null });
    mockSearchPhoto.mockResolvedValue(null);
    const firstSession = renderProvider();
    await act(async () => {
      await Promise.resolve();
      await expectResolvedSpecies(firstSession, MATCH.id);
    });

    const stored = JSON.parse((await AsyncStorage.getItem('bloom.speciesCache.v2'))!) as PlantSpecies[];
    expect(stored[0]).toEqual(
      expect.objectContaining({ description: 'Likes bright indirect light.', wikiArticle: 'One.\n\nTwo.\n\nThree.\n\nFour.' }),
    );

    const nextSession = renderProvider();
    await act(async () => {
      await Promise.resolve();
    });

    const shown = nextSession().getSpeciesById(String(MATCH.id));
    expect(shown?.description).toBe("We couldn't reliably find what this one looks like, but here's what we know:\n\nLikes bright indirect light.");
    expect(shown?.wikiArticle?.startsWith("We couldn't reliably find what this one looks like")).toBe(true);
    // Every read hands back the same object, so screens holding it do not see a new species each render.
    expect(nextSession().getSpeciesById(String(MATCH.id))).toBe(shown);
  });
});

describe('PlantDataProvider photo resolution', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGenerateSpeciesCopy.mockResolvedValue({
      category: 'Independent Roommate',
      description: 'desc',
      wikiArticle: 'article',
    });
  });

  it('uses a real Perenual photo when available, without calling Unsplash', async () => {
    mockSearchSpecies.mockResolvedValue([MATCH]);
    mockGetSpeciesDetails.mockResolvedValue(DETAILS);
    const getValue = renderProvider();

    let species!: PlantSpecies;
    await act(async () => {
      species = await expectResolvedSpecies(getValue, MATCH.id);
    });

    expect(species.detailImageUrl).toBe('https://example.com/zz.jpg');
    expect(mockSearchPhoto).not.toHaveBeenCalled();
    expect(species.description).toBe('desc');
  });

  it("skips Perenual's upgrade-placeholder image and falls through to Unsplash", async () => {
    const detailsWithPlaceholder: PerenualSpeciesDetails = {
      ...DETAILS,
      default_image: {
        medium_url: 'https://s3.example.com/upgrade_access.jpg',
        original_url: 'https://s3.example.com/upgrade_access.jpg',
        small_url: '',
      },
    };
    mockSearchSpecies.mockResolvedValue([MATCH]);
    mockGetSpeciesDetails.mockResolvedValue(detailsWithPlaceholder);
    mockSearchPhoto.mockResolvedValueOnce('https://images.unsplash.com/exact-match.jpg');
    const getValue = renderProvider();

    let species!: PlantSpecies;
    await act(async () => {
      species = await expectResolvedSpecies(getValue, MATCH.id);
    });

    expect(mockSearchPhoto).toHaveBeenCalledWith('Zamioculcas zamiifolia');
    expect(species.detailImageUrl).toBe('https://images.unsplash.com/exact-match.jpg');
  });

  it('falls through scientific name -> genus -> common name -> generic name tiers in order', async () => {
    const match: PerenualSpeciesListItem = { ...MATCH, common_name: 'Shirazz Japanese Maple' };
    const details: PerenualSpeciesDetails = {
      ...DETAILS,
      common_name: 'Shirazz Japanese Maple',
      default_image: null,
      scientific_name: ["Acer palmatum 'Gwen'"],
    };
    mockSearchSpecies.mockResolvedValue([match]);
    mockGetSpeciesDetails.mockResolvedValue(details);
    mockSearchPhoto
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('https://images.unsplash.com/generic.jpg');
    const getValue = renderProvider();

    let species!: PlantSpecies;
    await act(async () => {
      species = await expectResolvedSpecies(getValue, match.id);
    });

    // Botanical name first, always — whatever the user typed. See findSpeciesPhotoUrl.
    expect(mockSearchPhoto).toHaveBeenNthCalledWith(1, 'Acer palmatum');
    expect(mockSearchPhoto).toHaveBeenNthCalledWith(2, 'Acer');
    expect(mockSearchPhoto).toHaveBeenNthCalledWith(3, 'Shirazz Japanese Maple');
    expect(mockSearchPhoto).toHaveBeenNthCalledWith(4, 'Japanese Maple');
    expect(species.detailImageUrl).toBe('https://images.unsplash.com/generic.jpg');
  });

  it('falls back to the local no-plant-photo asset when every tier fails and there is no captured photo', async () => {
    mockSearchSpecies.mockResolvedValue([MATCH]);
    mockGetSpeciesDetails.mockResolvedValue({ ...DETAILS, default_image: null });
    mockSearchPhoto.mockResolvedValue(null);
    const getValue = renderProvider();

    let species!: PlantSpecies;
    await act(async () => {
      species = await expectResolvedSpecies(getValue, MATCH.id);
    });

    expect(species.detailImageUrl).toBe('');
    expect(species.image).not.toEqual({ uri: expect.any(String) });
    expect(species.description.startsWith("We couldn't reliably find what this one looks like")).toBe(true);
  });

  it('uses the captured photo as a fallback when every real-photo tier fails', async () => {
    mockSearchSpecies.mockResolvedValue([MATCH]);
    mockGetSpeciesDetails.mockResolvedValue({ ...DETAILS, default_image: null });
    mockSearchPhoto.mockResolvedValue(null);
    const capturedImage = { uri: 'file:///captured.jpg' };
    const getValue = renderProvider();

    let result!: Awaited<ReturnType<PlantDataContextValue['lookupSpeciesByName']>>;
    await act(async () => {
      result = await getValue().lookupSpeciesByName('ZZ plant', capturedImage);
    });

    expect(result).toEqual({ species: expect.objectContaining({ image: capturedImage }), success: true });
    // Having the user's own photo counts as "having a photo" — no "couldn't find it" hedge needed.
    expect(result.success && result.species.description).toBe('desc');
  });
});

describe('PlantDataProvider rate limiting', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('resolveSpeciesById reports rate-limited distinctly from a generic network error', async () => {
    // Constructed via the same (auto-mocked) import PlantDataProvider.tsx itself uses, so the
    // instanceof check in its catch block actually matches — jest.requireActual would bypass the
    // mock and construct a class the production code's instanceof check can never match.
    mockGetSpeciesDetails.mockRejectedValueOnce(new PlantApiError('rate-limited', 'rate limited'));
    const getValue = renderProvider();

    let result;
    await act(async () => {
      result = await getValue().resolveSpeciesById(MATCH.id);
    });

    expect(result).toEqual({ reason: 'rate-limited', success: false });
  });

  it('identifyAndResolveSpecies reports rate-limited when Pl@ntNet quota is exceeded', async () => {
    mockIdentifyPlant.mockRejectedValueOnce(new PlantIdApiError('quota-exceeded', 'quota exceeded'));
    const getValue = renderProvider();

    let result;
    await act(async () => {
      result = await getValue().identifyAndResolveSpecies({ uri: 'file:///captured.jpg' });
    });

    expect(result).toEqual({ reason: 'rate-limited', success: false });
  });

  it('identifyAndResolveSpecies falls back to a generic network error for other identifyPlant failures', async () => {
    mockIdentifyPlant.mockRejectedValueOnce(new PlantIdApiError('network', 'offline'));
    const getValue = renderProvider();

    let result;
    await act(async () => {
      result = await getValue().identifyAndResolveSpecies({ uri: 'file:///captured.jpg' });
    });

    expect(result).toEqual({ reason: 'network-error', success: false });
  });

  it('resolveSpeciesById reports access-denied distinctly from a generic network error', async () => {
    mockGetSpeciesDetails.mockRejectedValueOnce(new PlantApiError('forbidden', 'access denied'));
    const getValue = renderProvider();

    let result;
    await act(async () => {
      result = await getValue().resolveSpeciesById(MATCH.id);
    });

    expect(result).toEqual({ reason: 'access-denied', success: false });
  });

  it('resolveSpeciesById reports access-denied when copy generation (DeepSeek) is forbidden', async () => {
    mockSearchPhoto.mockResolvedValue(null);
    mockGenerateSpeciesCopy.mockRejectedValueOnce(new PlantCopyApiError('forbidden', 'access denied'));
    const getValue = renderProvider();

    let result;
    await act(async () => {
      result = await getValue().resolveSpeciesById(MATCH.id, undefined, 'ZZ plant');
    });

    expect(result).toEqual({ reason: 'access-denied', success: false });
  });

  it('identifyAndResolveSpecies reports access-denied when Pl@ntNet rejects the request (e.g. IP not allowed)', async () => {
    mockIdentifyPlant.mockRejectedValueOnce(new PlantIdApiError('forbidden', 'remote IP not allowed'));
    const getValue = renderProvider();

    let result;
    await act(async () => {
      result = await getValue().identifyAndResolveSpecies({ uri: 'file:///captured.jpg' });
    });

    expect(result).toEqual({ reason: 'access-denied', success: false });
  });
});

describe('PlantDataProvider identifyAndResolveSpecies name fallback', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSearchPhoto.mockResolvedValue(null);
    mockGenerateSpeciesCopy.mockResolvedValue({
      category: 'Independent Roommate',
      description: 'desc',
      wikiArticle: 'article',
    });
  });

  it('retries with the scientific name when Pl@ntNet\'s common name has no Perenual match', async () => {
    // Reproduces a real, confirmed case: Pl@ntNet returns "Honeyplant" for a Hoya carnosa
    // capture, and Perenual's species-list has zero matches for that exact common name, even
    // though it does index the same plant under its scientific name.
    mockIdentifyPlant.mockResolvedValueOnce([
      {
        score: 0.9,
        species: {
          commonNames: ['Honeyplant'],
          family: { scientificNameWithoutAuthor: 'Apocynaceae' },
          genus: { scientificNameWithoutAuthor: 'Hoya' },
          scientificNameWithoutAuthor: 'Hoya carnosa',
        },
      },
    ]);
    mockSearchSpecies
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { common_name: 'Wax plant', default_image: null, id: 77, scientific_name: ['Hoya carnosa'] },
      ]);

    const getValue = renderProvider();

    let result!: SpeciesLookupResult;
    await act(async () => {
      result = await getValue().identifyAndResolveSpecies({ uri: 'file:///captured.jpg' });
    });

    expect(mockSearchSpecies).toHaveBeenNthCalledWith(1, 'Honeyplant');
    expect(mockSearchSpecies).toHaveBeenNthCalledWith(2, 'Hoya carnosa');
    expect(result.success && result.species.speciesName).toBe('Wax plant');
  });

  it('falls back to the genus when both the common name and scientific name have no Perenual match', async () => {
    // Reproduces a real, confirmed case: Perenual has zero matches for "Moneytree" (the common
    // name) or "Pachira glabra" (the specific scientific name) — it simply doesn't carry that
    // species at all — but it does carry other species in the same genus, "Pachira".
    mockIdentifyPlant.mockResolvedValueOnce([
      {
        score: 0.9,
        species: {
          commonNames: ['Moneytree'],
          family: { scientificNameWithoutAuthor: 'Malvaceae' },
          genus: { scientificNameWithoutAuthor: 'Pachira' },
          scientificNameWithoutAuthor: 'Pachira glabra',
        },
      },
    ]);
    mockSearchSpecies
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { common_name: 'Guiana chestnut', default_image: null, id: 88, scientific_name: ['Pachira aquatica'] },
      ]);

    const getValue = renderProvider();

    let result!: SpeciesLookupResult;
    await act(async () => {
      result = await getValue().identifyAndResolveSpecies({ uri: 'file:///captured.jpg' });
    });

    expect(mockSearchSpecies).toHaveBeenNthCalledWith(1, 'Moneytree');
    expect(mockSearchSpecies).toHaveBeenNthCalledWith(2, 'Pachira glabra');
    expect(mockSearchSpecies).toHaveBeenNthCalledWith(3, 'Pachira');
    expect(result.success && result.species.speciesName).toBe('Guiana chestnut');
  });

  it('does not retry when every name tier collapses to the same single distinct name', async () => {
    mockIdentifyPlant.mockResolvedValueOnce([
      {
        score: 0.9,
        species: {
          commonNames: [],
          family: { scientificNameWithoutAuthor: 'Araceae' },
          genus: { scientificNameWithoutAuthor: 'Rhaphidophora tetrasperma' },
          scientificNameWithoutAuthor: 'Rhaphidophora tetrasperma',
        },
      },
    ]);
    mockSearchSpecies.mockResolvedValueOnce([]);

    const getValue = renderProvider();

    let result!: SpeciesLookupResult;
    await act(async () => {
      result = await getValue().identifyAndResolveSpecies({ uri: 'file:///captured.jpg' });
    });

    expect(mockSearchSpecies).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ reason: 'no-perenual-match', success: false });
  });

  it('does not retry when the common name search fails for a reason other than no-match', async () => {
    mockIdentifyPlant.mockResolvedValueOnce([
      {
        score: 0.9,
        species: {
          commonNames: ['Honeyplant'],
          family: { scientificNameWithoutAuthor: 'Apocynaceae' },
          genus: { scientificNameWithoutAuthor: 'Hoya' },
          scientificNameWithoutAuthor: 'Hoya carnosa',
        },
      },
    ]);
    mockSearchSpecies.mockRejectedValueOnce(new PlantApiError('forbidden', 'access denied'));

    const getValue = renderProvider();

    let result!: SpeciesLookupResult;
    await act(async () => {
      result = await getValue().identifyAndResolveSpecies({ uri: 'file:///captured.jpg' });
    });

    expect(mockSearchSpecies).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ reason: 'access-denied', success: false });
  });
});

describe('PlantDataProvider species/details MOCKED fallback', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSearchSpecies.mockResolvedValue([MATCH]);
    // Only exercised by the "no name available" test below — every knownName path now skips this
    // call entirely rather than waiting on it to fail, so this rejection stands in for what the
    // real (confirmed permanently blocked) endpoint would do if it were ever actually called.
    mockGetSpeciesDetails.mockRejectedValue(new PlantApiError('forbidden', 'Please Upgrade Plan'));
    mockSearchPhoto.mockResolvedValue('https://images.unsplash.com/zz-plant.jpg');
    mockGenerateSpeciesCopy.mockResolvedValue({
      category: 'Independent Roommate',
      description: 'Likes bright indirect light.',
      wikiArticle: 'A longer article.',
    });
  });

  it('lookupSpeciesByName succeeds with an accurate name/image without ever calling the blocked species/details endpoint', async () => {
    const getValue = renderProvider();

    let result: SpeciesLookupResult;
    await act(async () => {
      result = await getValue().lookupSpeciesByName('ZZ plant');
    });

    expect(result!).toEqual({
      species: expect.objectContaining({
        // Name comes from Perenual's own search match (real), not anything invented here.
        speciesName: 'ZZ plant',
        // Care facts come from this app's curated seed data via the name match, not fabricated.
        isToxicToPets: true,
        lightNeed: 'bright',
        wateringIntervalDays: 14,
        // The photo still comes from the real (unmocked-here) Unsplash call.
        detailImageUrl: 'https://images.unsplash.com/zz-plant.jpg',
      }),
      success: true,
    });
    // The name (from the real search match) was already known, so the guaranteed-to-fail
    // species/details round trip should never have been attempted.
    expect(mockGetSpeciesDetails).not.toHaveBeenCalled();
  });

  it('resolveSpeciesById still fails (no name available to build a fallback from, so the live call is attempted and fails)', async () => {
    const getValue = renderProvider();

    let result;
    await act(async () => {
      result = await getValue().resolveSpeciesById(MATCH.id);
    });

    expect(result).toEqual({ reason: 'access-denied', success: false });
    expect(mockGetSpeciesDetails).toHaveBeenCalledTimes(1);
  });

  it('treats an empty-string knownName the same as no knownName at all (attempts the live call, does not use the synthesized fallback)', async () => {
    const getValue = renderProvider();

    let result;
    await act(async () => {
      result = await getValue().resolveSpeciesById(MATCH.id, undefined, '');
    });

    expect(result).toEqual({ reason: 'access-denied', success: false });
    expect(mockGetSpeciesDetails).toHaveBeenCalledTimes(1);
  });

  it('resolveSpeciesById succeeds and skips the live call when a knownName is passed directly (e.g. from a tapped search result)', async () => {
    const getValue = renderProvider();

    let result: SpeciesLookupResult;
    await act(async () => {
      result = await getValue().resolveSpeciesById(MATCH.id, undefined, 'ZZ plant');
    });

    expect(result!.success).toBe(true);
    expect(mockGetSpeciesDetails).not.toHaveBeenCalled();
  });
});

describe('PlantDataProvider concurrent resolution', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGenerateSpeciesCopy.mockResolvedValue({
      category: 'Independent Roommate',
      description: 'desc',
      wikiArticle: 'article',
    });
  });

  it('shares one Perenual/DeepSeek round trip across concurrent resolveSpeciesById calls for the same id', async () => {
    mockGetSpeciesDetails.mockResolvedValue(DETAILS);
    const getValue = renderProvider();

    let first!: SpeciesLookupResult;
    let second!: SpeciesLookupResult;
    await act(async () => {
      const firstPromise = getValue().resolveSpeciesById(MATCH.id);
      const secondPromise = getValue().resolveSpeciesById(MATCH.id);
      [first, second] = await Promise.all([firstPromise, secondPromise]);
    });

    expect(mockGetSpeciesDetails).toHaveBeenCalledTimes(1);
    expect(mockGenerateSpeciesCopy).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('a concurrent knownName caller still succeeds even when a same-id no-name caller already has a doomed live call in flight', async () => {
    mockGetSpeciesDetails.mockRejectedValue(new PlantApiError('forbidden', 'Please Upgrade Plan'));
    mockSearchPhoto.mockResolvedValue('https://images.unsplash.com/zz-plant.jpg');
    const getValue = renderProvider();

    let withoutName!: SpeciesLookupResult;
    let withName!: SpeciesLookupResult;
    await act(async () => {
      // Started first, with no knownName — this attempt is doomed to hit the confirmed-blocked
      // live species/details call and fail. A same-id caller with a knownName must not be forced
      // to await (and fail alongside) this one.
      const withoutNamePromise = getValue().resolveSpeciesById(MATCH.id);
      const withNamePromise = getValue().resolveSpeciesById(MATCH.id, undefined, 'ZZ plant');
      [withoutName, withName] = await Promise.all([withoutNamePromise, withNamePromise]);
    });

    expect(withoutName).toEqual({ reason: 'access-denied', success: false });
    expect(withName.success).toBe(true);
  });

  it('reuses a still-pending no-knownName resolution instead of starting a duplicate call, even after an earlier knownName resolution for the same id already failed and cleaned up its own slot', async () => {
    let rejectDetails!: (error: unknown) => void;
    mockGetSpeciesDetails.mockImplementationOnce(
      () => new Promise((_resolve, reject) => { rejectDetails = reject; }),
    );
    mockSearchPhoto.mockResolvedValue('https://images.unsplash.com/zz-plant.jpg');
    // B's own copy-generation call fails, so B never reaches the point where it would populate
    // the shared core cache — its slot cleanup is the only thing that runs, which is what this
    // test needs to isolate (a B that instead succeeded would populate the cache directly, and C
    // would hit that cache before ever touching the in-flight map at all).
    mockGenerateSpeciesCopy.mockRejectedValueOnce(new Error('DeepSeek unavailable'));
    const getValue = renderProvider();

    let withoutNameA!: Promise<SpeciesLookupResult>;
    await act(async () => {
      // A: no knownName — kicks off the (controlled, still-pending) live species/details call.
      withoutNameA = getValue().resolveSpeciesById(MATCH.id);
      // B: knownName — skips the live call via the fast synthesized path, but fails on copy
      // generation, fully finishing (including its own in-flight-slot cleanup) while A is still
      // pending and without ever populating the shared core cache.
      const resultB = await getValue().resolveSpeciesById(MATCH.id, undefined, 'ZZ plant');
      expect(resultB.success).toBe(false);
    });

    expect(mockGetSpeciesDetails).toHaveBeenCalledTimes(1);

    let withoutNameC!: Promise<SpeciesLookupResult>;
    await act(async () => {
      // C: no knownName, arriving after B already cleaned up its slot — must reuse A's
      // still-pending entry, not start a second live species/details call.
      withoutNameC = getValue().resolveSpeciesById(MATCH.id);
    });

    expect(mockGetSpeciesDetails).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectDetails(new PlantApiError('forbidden', 'Please Upgrade Plan'));
    });

    await expect(withoutNameA).resolves.toEqual({ reason: 'access-denied', success: false });
    await expect(withoutNameC).resolves.toEqual({ reason: 'access-denied', success: false });
  });

  it('does not let two concurrent callers with different known names for the same speciesId silently share one result', async () => {
    mockSearchPhoto.mockResolvedValue(null);
    const getValue = renderProvider();

    let resultA!: SpeciesLookupResult;
    let resultB!: SpeciesLookupResult;
    await act(async () => {
      // Same speciesId, two different known names — e.g. a Library search match.common_name vs.
      // a separate Pl@ntNet identification's name for a species that happens to share this id.
      const promiseA = getValue().resolveSpeciesById(MATCH.id, undefined, 'ZZ plant');
      const promiseB = getValue().resolveSpeciesById(MATCH.id, undefined, 'Zanzibar Gem');
      [resultA, resultB] = await Promise.all([promiseA, promiseB]);
    });

    expect(resultA.success && resultA.species.speciesName).toBe('ZZ plant');
    expect(resultB.success && resultB.species.speciesName).toBe('Zanzibar gem');
    // Both names skip the confirmed-blocked live species/details call entirely — neither should
    // have needed it, and reusing the wrong in-flight entry is exactly what would have made one
    // of these two calls wrongly attempt it (or wrongly inherit the other's name).
    expect(mockGetSpeciesDetails).not.toHaveBeenCalled();
  });

  it('never lets one caller\'s fallback image leak into a concurrent caller\'s result for the same species', async () => {
    mockGetSpeciesDetails.mockResolvedValue({ ...DETAILS, default_image: null });
    mockSearchPhoto.mockResolvedValue(null);
    const capturedImage = { uri: 'file:///captured.jpg' };
    const getValue = renderProvider();

    let withoutFallback!: SpeciesLookupResult;
    let withFallback!: SpeciesLookupResult;
    await act(async () => {
      const withoutFallbackPromise = getValue().resolveSpeciesById(MATCH.id);
      const withFallbackPromise = getValue().resolveSpeciesById(MATCH.id, capturedImage);
      [withoutFallback, withFallback] = await Promise.all([withoutFallbackPromise, withFallbackPromise]);
    });

    // Both callers still only cost one real Perenual/DeepSeek round trip...
    expect(mockGetSpeciesDetails).toHaveBeenCalledTimes(1);
    expect(mockGenerateSpeciesCopy).toHaveBeenCalledTimes(1);

    // ...but each still gets its OWN correct image/description, regardless of resolution order.
    expect(withoutFallback.success && withoutFallback.species.image).not.toEqual(capturedImage);
    expect(
      withoutFallback.success && withoutFallback.species.description.startsWith("We couldn't reliably find"),
    ).toBe(true);

    expect(withFallback.success && withFallback.species.image).toEqual(capturedImage);
    expect(withFallback.success && withFallback.species.description).toBe('desc');

    // The persisted cache (future unrelated lookups) always keeps the no-fallback version, never
    // whichever caller happened to resolve first.
    expect(getValue().getSpeciesById(String(MATCH.id))).toEqual(withoutFallback.success && withoutFallback.species);
  });
});
