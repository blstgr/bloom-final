import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { launchCamera } from 'react-native-image-picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as StoreProvider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';

import { AppText } from '../src/components/ui/AppText';
import { Button } from '../src/components/ui/Button';
import { Touchable } from '../src/components/ui/Touchable';
import { CATALOG_ARTICLES } from '../src/features/plants/data/catalogArticles';
import { mockSpecies } from '../src/features/plants/data/mockPlants';
import { PlantDataProvider, usePlantData } from '../src/features/plants/data/PlantDataProvider';
import type { OwnedPlant, PlantSpecies } from '../src/features/plants/data/types';
import { WeatherProvider } from '../src/features/weather/WeatherProvider';
import {
  MainTabBar,
  SCREENS,
  type AddPlantCameraScreenProps,
  type FavoritesScreenProps,
  type LibraryScreenProps,
  type PlantDetailScreenProps,
  type PlantSearchScreenProps,
  type SpeciesInfoScreenProps,
} from '../src/navigation';
import { AddPlantCameraScreen } from '../src/screens/AddPlantCameraScreen';
import { FavoritesScreen } from '../src/screens/FavoritesScreen';
import { LibraryScreen } from '../src/screens/LibraryScreen';
import { PlantDetailScreen } from '../src/screens/PlantDetailScreen';
import { PlantSearchScreen } from '../src/screens/PlantSearchScreen';
import { SpeciesInfoScreen } from '../src/screens/SpeciesInfoScreen';
import { getSpeciesDetails, searchSpecies } from '../src/services/plantApi';
import { generateSpeciesCopy } from '../src/services/plantCopyApi';
import { searchPhoto } from '../src/services/unsplashApi';
import favoritesReducer from '../src/store/favoritesSlice';
import settingsReducer from '../src/store/settingsSlice';
import { store } from '../src/store/store';

jest.mock('react-native-image-picker');
jest.mock('../src/services/plantApi');
jest.mock('../src/services/plantCopyApi');
jest.mock('../src/services/unsplashApi');

const mockedLaunchCamera = jest.mocked(launchCamera);
const mockedSearchSpecies = jest.mocked(searchSpecies);
const mockedGetSpeciesDetails = jest.mocked(getSpeciesDetails);
const mockedGenerateSpeciesCopy = jest.mocked(generateSpeciesCopy);
const mockedSearchPhoto = jest.mocked(searchPhoto);
// Comfortably above useDebouncedSearch's own 350ms debounce so real-timer tests reliably
// let the debounced search fire before asserting on its result.
const SEARCH_DEBOUNCE_FLUSH_MS = 600;
beforeEach(() => {
  jest.clearAllMocks();
  // PlantSearchScreen's search-as-you-type debounce can still fire after a test body returns (real
  // timers, not fake ones) — give it a safe default so a stray fire never calls .then() on
  // undefined from an unconfigured automock.
  mockedSearchSpecies.mockResolvedValue([]);
  mockedSearchPhoto.mockResolvedValue(null);
});

const TEST_OWNED_PLANT: OwnedPlant = {
  addedAt: '2026-07-01T00:00:00.000Z',
  customName: 'Desk ZZ',
  image: mockSpecies[0].image,
  ownedPlantId: 'owned-plant-test',
  speciesId: mockSpecies[0].speciesId,
  wateringHistory: [],
};
const TEST_SAFE_AREA_METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

function createPlantDetailProps(
  ownedPlantId?: string,
  goBack = jest.fn(),
  replace = jest.fn(),
  canGoBack = true,
): PlantDetailScreenProps {
  return {
    navigation: {
      canGoBack: () => canGoBack,
      getParent: () => undefined,
      goBack,
      replace,
    },
    route: {
      key: SCREENS.PLANT_DETAIL,
      name: SCREENS.PLANT_DETAIL,
      params: ownedPlantId ? { ownedPlantId } : undefined,
    },
  } as unknown as PlantDetailScreenProps;
}

function createLibraryProps(
  rootNavigate = jest.fn(),
  tabNavigate = jest.fn(),
  openDrawer = jest.fn(),
): LibraryScreenProps {
  return {
    navigation: {
      getParent: () => ({
        getParent: () => ({
          navigate: rootNavigate,
        }),
        openDrawer,
      }),
      navigate: tabNavigate,
    },
    route: {
      key: SCREENS.LIBRARY,
      name: SCREENS.LIBRARY,
    },
  } as unknown as LibraryScreenProps;
}

/** The search screen's text field — the one node labelled "Search for a plant" that edits. */
function findSearchField(renderer: ReactTestRenderer.ReactTestRenderer | undefined) {
  return renderer!.root.findAll(
    node => node.props.accessibilityLabel === 'Search for a plant' && typeof node.props.onChangeText === 'function',
  )[0];
}

function createPlantSearchProps(replace = jest.fn(), goBack = jest.fn()): PlantSearchScreenProps {
  return {
    navigation: { addListener: () => () => undefined, goBack, replace },
    route: { key: SCREENS.PLANT_SEARCH, name: SCREENS.PLANT_SEARCH },
  } as unknown as PlantSearchScreenProps;
}

function createSpeciesInfoProps(
  speciesId?: string,
  goBack = jest.fn(),
  replace = jest.fn(),
  canGoBack = true,
): SpeciesInfoScreenProps {
  return {
    navigation: {
      canGoBack: () => canGoBack,
      goBack,
      replace,
    },
    route: {
      key: SCREENS.SPECIES_INFO,
      name: SCREENS.SPECIES_INFO,
      params: speciesId ? { speciesId } : undefined,
    },
  } as unknown as SpeciesInfoScreenProps;
}

function createFavoritesProps(
  tabNavigate = jest.fn(),
  rootNavigate = jest.fn(),
  openDrawer = jest.fn(),
): FavoritesScreenProps {
  return {
    navigation: {
      getParent: () => ({
        getParent: () => ({
          navigate: rootNavigate,
        }),
        openDrawer,
      }),
      navigate: tabNavigate,
    },
    route: {
      key: SCREENS.FAVORITES,
      name: SCREENS.FAVORITES,
      params: undefined,
    },
  } as unknown as FavoritesScreenProps;
}

function createAddPlantCameraProps(
  navigate = jest.fn(),
): AddPlantCameraScreenProps {
  return {
    navigation: {
      getParent: () => ({
        goBack: jest.fn(),
      }),
      navigate,
    },
    route: {
      key: SCREENS.ADD_PLANT_CAMERA,
      name: SCREENS.ADD_PLANT_CAMERA,
      params: undefined,
    },
  } as unknown as AddPlantCameraScreenProps;
}

function renderWithProviders(
  children: React.ReactNode,
  initialOwnedPlants: OwnedPlant[] = [],
  favoritesStore = store,
) {
  return (
    <StoreProvider store={favoritesStore}>
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <PlantDataProvider initialOwnedPlants={initialOwnedPlants}>
          <WeatherProvider>{children}</WeatherProvider>
        </PlantDataProvider>
      </SafeAreaProvider>
    </StoreProvider>
  );
}

test('renders plant detail for a valid owned plant id', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(
        <PlantDetailScreen {...createPlantDetailProps(TEST_OWNED_PLANT.ownedPlantId)} />,
        [TEST_OWNED_PLANT],
      ),
    );
  });

  expect(
    renderer?.root.findAllByProps({ value: TEST_OWNED_PLANT.customName }).length,
  ).toBeGreaterThan(0);
});

test('deletes a plant from the detail screen and returns', async () => {
  const goBack = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(
        <PlantDetailScreen
          {...createPlantDetailProps(TEST_OWNED_PLANT.ownedPlantId, goBack)}
        />,
        [TEST_OWNED_PLANT],
      ),
    );
  });

  await ReactTestRenderer.act(() => {
    renderer?.root.findByProps({ accessibilityLabel: 'Delete plant' }).props.onPress();
  });

  expect(goBack).toHaveBeenCalledTimes(1);
});

test('renders an error modal when owned plant id is missing', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<PlantDetailScreen {...createPlantDetailProps()} />),
    );
  });

  expect(
    renderer?.root.findByProps({
      children: 'Plant details could not be opened because no saved plant was selected.',
    }),
  ).toBeTruthy();
});

test('missing plant detail can close to home when there is no back route', async () => {
  const replace = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<PlantDetailScreen {...createPlantDetailProps(undefined, jest.fn(), replace, false)} />),
    );
  });

  await ReactTestRenderer.act(() => {
    renderer?.root.findByType(Button).props.onPress();
  });

  expect(replace).toHaveBeenCalledWith(SCREENS.SETTINGS_DRAWER, {
    params: { screen: SCREENS.HOME },
    screen: SCREENS.MAIN_TABS,
  });
});

test('the Library opens on the popular grid, with search one tap away', async () => {
  const rootNavigate = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<LibraryScreen {...createLibraryProps(rootNavigate)} />),
    );
  });

  // No location in tests, so the grid is the ten most popular plants — never an empty state.
  expect(renderer?.root.findAllByProps({ accessibilityLabel: 'Open Snake plant' }).length).toBeGreaterThan(0);

  await ReactTestRenderer.act(() => {
    renderer?.root
      .findAll(node => node.props.accessibilityLabel === 'Search for a plant' && typeof node.props.onPress === 'function')[0]
      .props.onPress();
  });

  expect(rootNavigate).toHaveBeenCalledWith(SCREENS.PLANT_SEARCH);
});

test('the Library chips filter the grid', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<LibraryScreen {...createLibraryProps()} />),
    );
  });

  const hasCardFor = (speciesName: string) =>
    renderer!.root.findAllByProps({ accessibilityLabel: `Open ${speciesName}` }).length > 0;
  const shadyChip = renderer!.root
    .findAllByType(Touchable)
    .find(node => node.props.accessibilityRole === 'tab' && node.findByType(AppText).props.children === 'Shady');

  // Fiddle leaf fig wants bright light; snake plant copes with shade.
  expect(hasCardFor('Fiddle leaf fig')).toBe(true);
  await ReactTestRenderer.act(() => {
    shadyChip!.props.onPress();
  });
  expect(hasCardFor('Fiddle leaf fig')).toBe(false);
  expect(hasCardFor('Snake plant')).toBe(true);
});

// The tab bar used to be rendered by each screen, so this was asserted on LibraryScreen. It is
// now rendered once by the navigator (see TabNavigator/FloatingTabBar), so the selected-tab
// behaviour is checked where it actually lives.
test('the tab bar marks the active tab selected', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(
        <MainTabBar
          activeScreen={SCREENS.LIBRARY}
          onAddPlant={jest.fn()}
          onNavigate={jest.fn()}
        />,
      ),
    );
  });

  expect(
    renderer?.root
      .findAllByProps({ accessibilityLabel: 'plant wiki' })
      .some(node => node.props.accessibilityState?.selected === true),
  ).toBe(true);
});

test('a shipped species match lists and opens without waiting for Perenual', async () => {
  const replace = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  // Deliberately never resolves: a shipped match must not depend on the network call completing.
  mockedSearchSpecies.mockReturnValueOnce(new Promise(() => {}));

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<PlantSearchScreen {...createPlantSearchProps(replace)} />),
    );
  });

  await ReactTestRenderer.act(() => {
    findSearchField(renderer).props.onChangeText('Zebra haworthia');
  });

  // Past the debounce, so the Perenual call is actually made and left hanging — the shipped row
  // must already be there regardless.
  await ReactTestRenderer.act(async () => {
    await new Promise(resolve => setTimeout(resolve, SEARCH_DEBOUNCE_FLUSH_MS));
  });
  expect(mockedSearchSpecies).toHaveBeenCalled();

  await ReactTestRenderer.act(() => {
    renderer?.root.findAll(node => node.props.accessibilityLabel === 'Open Zebra haworthia' && node.props.onPress)[0].props.onPress();
  });

  // The seed slug, not a Perenual number: SpeciesInfoScreen resolves it through getSpeciesById
  // before it ever reaches the network. Replaced rather than pushed, so closing the article
  // returns to the Library, not to a half-typed search.
  expect(replace).toHaveBeenCalledWith(SCREENS.SPECIES_INFO, {
    speciesId: 'zebra-haworthia',
    speciesName: 'Zebra haworthia',
  });

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
});

test('navigates from a remote search result to species info with its Perenual id', async () => {
  const replace = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  mockedSearchSpecies.mockResolvedValueOnce([
    {
      common_name: 'weeping fig',
      default_image: null,
      id: 501,
      scientific_name: ['Ficus benjamina'],
    },
  ]);

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<PlantSearchScreen {...createPlantSearchProps(replace)} />),
    );
  });

  await ReactTestRenderer.act(() => {
    findSearchField(renderer).props.onChangeText('weeping fig');
  });

  // A separate act() call: the one above must return (flushing the state update and the effect
  // it triggers, which is what actually schedules the debounce timer) before this starts waiting.
  await ReactTestRenderer.act(async () => {
    await new Promise(resolve => setTimeout(resolve, SEARCH_DEBOUNCE_FLUSH_MS));
  });

  // Perenual's lowercase name arrives sentence-cased.
  await ReactTestRenderer.act(() => {
    renderer?.root.findAll(node => node.props.accessibilityLabel === 'Open Weeping fig' && node.props.onPress)[0].props.onPress();
  });

  expect(replace).toHaveBeenCalledWith(SCREENS.SPECIES_INFO, {
    speciesId: '501',
    speciesName: 'Weeping fig',
  });
});

test('the search close icon clears a query, then leaves search', async () => {
  const goBack = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<PlantSearchScreen {...createPlantSearchProps(jest.fn(), goBack)} />),
    );
  });

  await ReactTestRenderer.act(() => {
    findSearchField(renderer).props.onChangeText('Z');
  });
  await ReactTestRenderer.act(() => {
    renderer?.root.findAll(node => node.props.accessibilityLabel === 'Clear search' && node.props.onPress)[0].props.onPress();
  });

  expect(findSearchField(renderer).props.value).toBe('');
  expect(goBack).not.toHaveBeenCalled();

  await ReactTestRenderer.act(() => {
    renderer?.root.findAll(node => node.props.accessibilityLabel === 'Close search' && node.props.onPress)[0].props.onPress();
  });

  expect(goBack).toHaveBeenCalled();

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
});

test('library camera search launches the camera flow', async () => {
  const rootNavigate = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<LibraryScreen {...createLibraryProps(rootNavigate)} />),
    );
  });

  await ReactTestRenderer.act(() => {
    renderer?.root.findByProps({ accessibilityLabel: 'Search plant by photo' }).props.onPress();
  });

  expect(rootNavigate).toHaveBeenCalledWith(SCREENS.ADD_PLANT_STACK, {
    screen: SCREENS.ADD_PLANT_CAMERA,
    params: { mode: 'search' },
  });
});

test('renders an error modal when species id is missing', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<SpeciesInfoScreen {...createSpeciesInfoProps()} />),
    );
  });

  expect(
    renderer?.root.findByProps({
      children: 'Plant info could not be opened because no species was selected.',
    }),
  ).toBeTruthy();
});

test('missing species info can close to home when there is no back route', async () => {
  const replace = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<SpeciesInfoScreen {...createSpeciesInfoProps(undefined, jest.fn(), replace, false)} />),
    );
  });

  await ReactTestRenderer.act(() => {
    renderer?.root.findByType(Button).props.onPress();
  });

  expect(replace).toHaveBeenCalledWith(SCREENS.SETTINGS_DRAWER, {
    params: { screen: SCREENS.HOME },
    screen: SCREENS.MAIN_TABS,
  });
});

test('SpeciesInfoScreen does not act on a resolution that finishes after the screen unmounted', async () => {
  // A probe sibling that stays mounted (inside the same, persistent PlantDataProvider) so we can
  // observe whether the unmounted screen's resolution still reached into shared Context state.
  let latestSearchHistory: PlantSpecies[] = [];
  function SearchHistoryProbe() {
    const { searchHistory } = usePlantData();
    latestSearchHistory = searchHistory;
    return null;
  }

  // Explicit resets (not just the top-level beforeEach's clearAllMocks, which clears call counts
  // but leaves any *queued* mockResolvedValueOnce/mockReturnValueOnce values from earlier tests in
  // place) so this test's controlled promise is guaranteed to be the one the code actually awaits,
  // regardless of what ran before it in this file.
  mockedGetSpeciesDetails.mockReset();
  mockedGenerateSpeciesCopy.mockReset();

  let resolveDetails!: (details: Awaited<ReturnType<typeof getSpeciesDetails>>) => void;
  mockedGetSpeciesDetails.mockReturnValueOnce(
    new Promise(resolve => {
      resolveDetails = resolve;
    }),
  );
  mockedGenerateSpeciesCopy.mockResolvedValueOnce({
    category: 'Independent Roommate',
    description: 'Arrived too late.',
    wikiArticle: 'A longer article.',
  });

  function Harness({ mounted }: { mounted: boolean }) {
    return (
      <StoreProvider store={store}>
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <PlantDataProvider>
            <SearchHistoryProbe />
            {mounted ? <SpeciesInfoScreen {...createSpeciesInfoProps('999')} /> : null}
          </PlantDataProvider>
        </SafeAreaProvider>
      </StoreProvider>
    );
  }

  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<Harness mounted />);
  });

  // Unmount the screen (e.g. the user backed out) while its optimistic resolution is still
  // pending — the surrounding providers (and the probe) stay mounted, mirroring how the real app
  // keeps PlantDataProvider alive across screen navigation.
  await ReactTestRenderer.act(() => {
    renderer?.update(<Harness mounted={false} />);
  });

  await ReactTestRenderer.act(async () => {
    resolveDetails({
      care_level: 'Easy',
      common_name: 'Late Plant',
      default_image: null,
      dimensions: null,
      growth_rate: 'Low',
      id: 999,
      poisonous_to_humans: false,
      poisonous_to_pets: false,
      scientific_name: ['Latus plantus'],
      sunlight: null,
      watering_general_benchmark: { unit: 'days', value: '14' },
    });
    await Promise.resolve();
    await Promise.resolve();
  });

  // The resolution finished, but the screen that started it was already gone — it must not have
  // recorded search history on the still-mounted provider.
  expect(latestSearchHistory).toEqual([]);
});

test('a shipped species shows its own article, each paragraph once', async () => {
  const species = mockSpecies[0];
  const paragraphs = CATALOG_ARTICLES[species.speciesId].split('\n\n');
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<SpeciesInfoScreen {...createSpeciesInfoProps(species.speciesId)} />),
    );
  });

  paragraphs.forEach(paragraph => {
    expect(
      renderer!.root.findAll(node => node.props.children === paragraph && typeof node.type === 'string'),
    ).toHaveLength(1);
  });
});

test('toggles a species favorite from SpeciesInfoScreen and flips the heart button state', async () => {
  // Isolated store per test — the app's singleton `store` is shared across every test in this
  // file, and this test dispatches into it, so a fresh instance keeps that mutation from leaking
  // into unrelated tests that render MainTabBar/other screens against the shared singleton.
  const testStore = configureStore({
    reducer: { favorites: favoritesReducer, settings: settingsReducer },
  });
  const species = mockSpecies[0];
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(
        <SpeciesInfoScreen {...createSpeciesInfoProps(species.speciesId)} />,
        [],
        testStore,
      ),
    );
  });

  const findHeartButton = (label: string) =>
    renderer!.root.findAllByProps({ accessibilityLabel: label })[0];

  expect(findHeartButton('Add to favorites').props.accessibilityState).toEqual({ selected: false });

  await ReactTestRenderer.act(() => {
    findHeartButton('Add to favorites').props.onPress();
  });

  expect(testStore.getState().favorites).toEqual([
    expect.objectContaining({ speciesId: species.speciesId, speciesName: species.speciesName }),
  ]);
  expect(findHeartButton('Remove from favorites').props.accessibilityState).toEqual({ selected: true });

  await ReactTestRenderer.act(() => {
    findHeartButton('Remove from favorites').props.onPress();
  });

  expect(testStore.getState().favorites).toEqual([]);
  expect(findHeartButton('Add to favorites').props.accessibilityState).toEqual({ selected: false });
});

test('filters favorited species by the active tab on FavoritesScreen', async () => {
  // zz-plant: toxic to pets, bright light, 14-day interval -> "easy".
  // parlor-palm: pet-safe, shade-tolerant, 12-day interval -> "manageable".
  const zzPlant = mockSpecies.find(species => species.speciesId === 'zz-plant')!;
  const parlorPalm = mockSpecies.find(species => species.speciesId === 'parlor-palm')!;
  const testStore = configureStore({
    reducer: { favorites: favoritesReducer, settings: settingsReducer },
    preloadedState: {
      favorites: [
        { addedAt: '2026-01-01T00:00:00.000Z', image: zzPlant.image, speciesId: zzPlant.speciesId, speciesName: zzPlant.speciesName },
        { addedAt: '2026-01-02T00:00:00.000Z', image: parlorPalm.image, speciesId: parlorPalm.speciesId, speciesName: parlorPalm.speciesName },
      ],
    },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<FavoritesScreen {...createFavoritesProps()} />, [], testStore),
    );
  });

  const hasCardFor = (speciesName: string) =>
    renderer!.root.findAllByProps({ accessibilityLabel: `Open ${speciesName}` }).length > 0;
  const findTab = (label: string) =>
    renderer!.root
      .findAllByType(Touchable)
      .find(node => node.props.accessibilityRole === 'tab' && node.findByType(AppText).props.children === label);
  const pressTab = (label: string) => {
    const tab = findTab(label);
    ReactTestRenderer.act(() => {
      tab!.props.onPress();
    });
  };

  expect(hasCardFor(zzPlant.speciesName)).toBe(true);
  expect(hasCardFor(parlorPalm.speciesName)).toBe(true);

  // Moody matches neither favorited species, so it shouldn't even be offered as a chip.
  expect(findTab('Moody')).toBeUndefined();

  pressTab('Pet-safe');
  expect(hasCardFor(zzPlant.speciesName)).toBe(false);
  expect(hasCardFor(parlorPalm.speciesName)).toBe(true);

  pressTab('Unkillable');
  expect(hasCardFor(zzPlant.speciesName)).toBe(true);
  expect(hasCardFor(parlorPalm.speciesName)).toBe(false);
});

test('FavoritesScreen has no designed empty state — it falls back to Home if reached with zero favorites', async () => {
  // The heart nav item only exists while favorites.length > 0, so landing here empty (e.g.
  // unfavoriting your last plant while already on this screen) should navigate to Home
  // immediately rather than render a dedicated empty state.
  const testStore = configureStore({
    reducer: { favorites: favoritesReducer, settings: settingsReducer },
  });
  const tabNavigate = jest.fn();

  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      renderWithProviders(<FavoritesScreen {...createFavoritesProps(tabNavigate)} />, [], testStore),
    );
  });

  expect(tabNavigate).toHaveBeenCalledWith(SCREENS.HOME);
});

test('camera flow uses native camera capture when a device photo is available', async () => {
  const navigate = jest.fn();
  mockedLaunchCamera.mockResolvedValueOnce({
    assets: [{ uri: 'file:///captured-plant.jpg' }],
  });
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<AddPlantCameraScreen {...createAddPlantCameraProps(navigate)} />),
    );
  });

  await ReactTestRenderer.act(async () => {
    await renderer?.root
      .findByProps({ accessibilityLabel: 'Snap photo' })
      .props.onPress();
  });

  expect(mockedLaunchCamera).toHaveBeenCalledWith({
    cameraType: 'back',
    maxHeight: 1280,
    maxWidth: 1280,
    mediaType: 'photo',
    quality: 0.8,
    saveToPhotos: false,
  });
  expect(navigate).toHaveBeenCalledWith(SCREENS.ADD_PLANT_LOADER, {
    captureId: 'detection-1',
    mode: undefined,
  });
});

test('camera flow uses the simulator fallback only when native camera is unavailable', async () => {
  const navigate = jest.fn();
  mockedLaunchCamera.mockRejectedValueOnce(new Error('camera unavailable'));
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<AddPlantCameraScreen {...createAddPlantCameraProps(navigate)} />),
    );
  });

  await ReactTestRenderer.act(async () => {
    await renderer?.root
      .findByProps({ accessibilityLabel: 'Snap photo' })
      .props.onPress();
  });

  expect(mockedLaunchCamera).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith(SCREENS.ADD_PLANT_LOADER, {
    captureId: 'detection-1',
    mode: undefined,
  });
});
