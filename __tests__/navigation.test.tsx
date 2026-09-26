import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as StoreProvider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';

import { AppText } from '../src/components/ui/AppText';
import { Button } from '../src/components/ui/Button';
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
  type SpeciesInfoScreenProps,
} from '../src/navigation';
import { AddPlantCameraScreen } from '../src/screens/AddPlantCameraScreen';
import { FavoritesScreen } from '../src/screens/FavoritesScreen';
import { LibraryScreen } from '../src/screens/LibraryScreen';
import { PlantDetailScreen } from '../src/screens/PlantDetailScreen';
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
// Comfortably above LibraryScreen's own SEARCH_DEBOUNCE_MS (350ms) so real-timer tests reliably
// let the debounced search fire before asserting on its result.
const SEARCH_DEBOUNCE_FLUSH_MS = 600;
beforeEach(() => {
  jest.clearAllMocks();
  // LibraryScreen's search-as-you-type debounce can still fire after a test body returns (real
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

test('renders library search', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<LibraryScreen {...createLibraryProps()} />),
    );
  });

  expect(renderer?.root.findByProps({ accessibilityLabel: 'Search plant wiki' })).toBeTruthy();
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

test('a seed species match lists and opens without waiting for Perenual', async () => {
  const rootNavigate = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  // Deliberately never resolves: a seed match must not depend on the network call completing.
  mockedSearchSpecies.mockReturnValueOnce(new Promise(() => {}));

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<LibraryScreen {...createLibraryProps(rootNavigate)} />),
    );
  });

  await ReactTestRenderer.act(() => {
    renderer?.root.findByProps({ accessibilityLabel: 'Search plant wiki' }).props.onChangeText('Zebra Haworthia');
  });

  await ReactTestRenderer.act(() => {
    renderer?.root.findByProps({ accessibilityLabel: 'Open Zebra Haworthia' }).props.onPress();
  });

  // The seed slug, not a Perenual number: SpeciesInfoScreen resolves it through getSpeciesById
  // before it ever reaches the network.
  expect(rootNavigate).toHaveBeenCalledWith(SCREENS.SPECIES_INFO, {
    speciesId: 'zebra-haworthia',
    speciesName: 'Zebra Haworthia',
  });
});

test('navigates from library search result to species info with species id', async () => {
  const rootNavigate = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  mockedSearchSpecies.mockResolvedValueOnce([
    {
      common_name: 'Fiddle Leaf Fig',
      default_image: null,
      id: 501,
      scientific_name: ['Ficus lyrata'],
    },
  ]);
  mockedGetSpeciesDetails.mockResolvedValueOnce({
    care_level: 'Easy',
    common_name: 'Fiddle Leaf Fig',
    default_image: null,
    dimensions: null,
    growth_rate: 'Low',
    id: 501,
    poisonous_to_humans: false,
    poisonous_to_pets: false,
    scientific_name: ['Ficus lyrata'],
    sunlight: null,
    watering_general_benchmark: { unit: 'days', value: '14' },
  });
  mockedGenerateSpeciesCopy.mockResolvedValueOnce({
    category: 'Desert minimalist',
    description: 'Only needs water when fully dry.',
    wikiArticle: 'A longer article.',
  });

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<LibraryScreen {...createLibraryProps(rootNavigate)} />),
    );
  });

  await ReactTestRenderer.act(() => {
    renderer?.root.findByProps({ accessibilityLabel: 'Search plant wiki' }).props.onChangeText('Fiddle Leaf Fig');
  });

  // A separate act() call: the one above must return (flushing the state update and the effect
  // it triggers, which is what actually schedules the debounce timer) before this starts waiting
  // — otherwise the wait below elapses before the timer is even scheduled.
  await ReactTestRenderer.act(async () => {
    await new Promise(resolve => setTimeout(resolve, SEARCH_DEBOUNCE_FLUSH_MS));
  });

  await ReactTestRenderer.act(() => {
    renderer?.root.findByProps({ accessibilityLabel: 'Open Fiddle Leaf Fig' }).props.onPress();
  });

  // Flushes the tap handler's own getSpeciesDetails -> generateSpeciesCopy promise chain.
  await ReactTestRenderer.act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  expect(rootNavigate).toHaveBeenCalledWith(SCREENS.SPECIES_INFO, {
    speciesId: '501',
    speciesName: 'Fiddle Leaf Fig',
  });
});

test('library search replaces camera action with clear action while typing', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      renderWithProviders(<LibraryScreen {...createLibraryProps()} />),
    );
  });

  expect(renderer?.root.findByProps({ accessibilityLabel: 'Search plant by photo' })).toBeTruthy();

  await ReactTestRenderer.act(() => {
    renderer?.root.findByProps({ accessibilityLabel: 'Search plant wiki' }).props.onChangeText('Z');
  });

  expect(renderer?.root.findAllByProps({ accessibilityLabel: 'Search plant by photo' })).toHaveLength(0);
  expect(renderer?.root.findByProps({ accessibilityLabel: 'Clear plant search' })).toBeTruthy();

  // Unmount before the test ends so the pending search-debounce timeout this typing started
  // (never awaited above, since this test only checks synchronous UI state) is cancelled by the
  // effect cleanup, rather than firing later against a torn-down Jest environment.
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
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityRole === 'tab' && node.findByType(AppText).props.children === label);
  const pressTab = (label: string) => {
    const tab = findTab(label);
    ReactTestRenderer.act(() => {
      tab!.props.onPress();
    });
  };

  expect(hasCardFor(zzPlant.speciesName)).toBe(true);
  expect(hasCardFor(parlorPalm.speciesName)).toBe(true);

  // High-Maintenance matches neither favorited species, so it shouldn't even be offered as a tab.
  expect(findTab('High-Maintenance')).toBeUndefined();

  pressTab('Pet Approved');
  expect(hasCardFor(zzPlant.speciesName)).toBe(false);
  expect(hasCardFor(parlorPalm.speciesName)).toBe(true);

  pressTab('Easy Peasy');
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
