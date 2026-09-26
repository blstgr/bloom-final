import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as StoreProvider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';

import { mockSpecies } from '../src/features/plants/data/mockPlants';
import { PlantDataProvider, usePlantData } from '../src/features/plants/data/PlantDataProvider';
import type { OwnedPlant, PlantSpecies } from '../src/features/plants/data/types';
import { WeatherProvider } from '../src/features/weather/WeatherProvider';
import { SCREENS, type HomeScreenProps } from '../src/navigation';
import { HomeScreen } from '../src/screens/HomeScreen';
import { store } from '../src/store/store';

// Counts how many times a card actually renders. Must be `mock`-prefixed so jest's hoisted
// module factory below is allowed to reference it.
const mockPlantCardRenders: string[] = [];

// Stubbed at the leaf so the count reflects HomeScreen's memoization, not PlantCard's internals.
jest.mock('../src/components/ui/PlantCard', () => ({
  PlantCard: ({ accessibilityLabel }: { accessibilityLabel: string }) => {
    mockPlantCardRenders.push(accessibilityLabel);
    return null;
  },
}));

const TEST_SAFE_AREA_METRICS = {
  frame: { height: 800, width: 400, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};

function createOwnedPlant(index: number): OwnedPlant {
  return {
    addedAt: '2026-07-01T00:00:00.000Z',
    customName: `Plant ${index}`,
    image: mockSpecies[index].image,
    ownedPlantId: `owned-plant-${index}`,
    speciesId: mockSpecies[index].speciesId,
    wateringHistory: [],
  };
}

/** React Navigation hands back stable navigator objects across renders; these mocks must do the
 * same, otherwise `rootNavigation` would change identity every render and defeat the very
 * `useCallback` this test is checking. */
function createHomeProps(): HomeScreenProps {
  const rootNavigation = { navigate: jest.fn() };
  const drawerNavigation = { getParent: () => rootNavigation, openDrawer: jest.fn() };

  return {
    navigation: {
      getParent: () => drawerNavigation,
      navigate: jest.fn(),
    },
    route: { key: SCREENS.HOME, name: SCREENS.HOME, params: undefined },
  } as unknown as HomeScreenProps;
}

let addSearchHistoryEntry: ((species: PlantSpecies) => void) | undefined;
let renameOwnedPlant: ((ownedPlantId: string, customName: string) => unknown) | undefined;

function ContextProbe() {
  const plantData = usePlantData();
  addSearchHistoryEntry = plantData.addSearchHistoryEntry;
  renameOwnedPlant = plantData.renameOwnedPlant;
  return null;
}

beforeEach(() => {
  mockPlantCardRenders.length = 0;
  addSearchHistoryEntry = undefined;
  renameOwnedPlant = undefined;
});

test('an unrelated PlantDataProvider update does not re-render the Home plant cards', async () => {
  const ownedPlants = [createOwnedPlant(0), createOwnedPlant(1)];

  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <StoreProvider store={store}>
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <PlantDataProvider initialOwnedPlants={ownedPlants}>
            <WeatherProvider>
              <ContextProbe />
            <HomeScreen {...createHomeProps()} />
            </WeatherProvider>
          </PlantDataProvider>
        </SafeAreaProvider>
      </StoreProvider>,
    );
  });

  expect(mockPlantCardRenders).toEqual(['Open Plant 0', 'Open Plant 1']);
  const rendersAfterMount = mockPlantCardRenders.length;

  // `searchHistory` is a field HomeScreen never reads. Before the memoization work this still
  // produced a new context value, re-rendering HomeScreen *and* every card beneath it.
  await ReactTestRenderer.act(() => {
    addSearchHistoryEntry?.(mockSpecies[2]);
  });

  expect(mockPlantCardRenders.length).toBe(rendersAfterMount);
});

test('a real owned-plant change still re-renders its card', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <StoreProvider store={store}>
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <PlantDataProvider initialOwnedPlants={[createOwnedPlant(0), createOwnedPlant(1)]}>
            <WeatherProvider>
              <ContextProbe />
            <HomeScreen {...createHomeProps()} />
            </WeatherProvider>
          </PlantDataProvider>
        </SafeAreaProvider>
      </StoreProvider>,
    );
  });

  expect(mockPlantCardRenders).toEqual(['Open Plant 0', 'Open Plant 1']);
  mockPlantCardRenders.length = 0;

  // Memoization must not make the grid stale: renaming one plant has to re-render that card —
  // and only that card.
  await ReactTestRenderer.act(() => {
    renameOwnedPlant?.('owned-plant-0', 'Renamed Plant');
  });

  expect(mockPlantCardRenders).toEqual(['Open Renamed Plant']);
});
