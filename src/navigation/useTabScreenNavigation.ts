import type { DrawerNavigationProp } from '@react-navigation/drawer';
import React from 'react';

import { SCREENS } from './constants';
import type {
  RootNavigation,
  RootStackParamList,
  SettingsDrawerParamList,
  TabParamList,
} from './types';

type TabNavigation = {
  getParent: <T>() => T | undefined;
  navigate: (screen: keyof TabParamList) => void;
};

type SpeciesInfoParams = RootStackParamList[typeof SCREENS.SPECIES_INFO];

/**
 * The navigation a tab screen needs, as named intents rather than a navigator.
 *
 * Every tab screen sits three navigators deep (tab inside drawer inside root stack), and each one
 * used to walk that chain itself with `navigation.getParent()?.getParent<RootNavigation>()`. That
 * encodes the nesting depth as a literal count at four call sites: insert or remove a navigator
 * and all four are wrong, silently — `?.` swallows the undefined and the tap simply does nothing.
 * TypeScript cannot catch it either, because `getParent()` is loosely typed by design.
 *
 * The chain is walked here, once. Callers get intents, never a navigator, so a screen cannot
 * depend on how deep it happens to sit.
 */
export function useTabScreenNavigation(navigation: TabNavigation) {
  const rootNavigation = navigation.getParent<{ getParent: <T>() => T | undefined }>()?.getParent<RootNavigation>();

  const openSettings = React.useCallback(() => {
    navigation.getParent<DrawerNavigationProp<SettingsDrawerParamList>>()?.openDrawer();
  }, [navigation]);

  const navigateTab = React.useCallback(
    (screen: keyof TabParamList) => {
      navigation.navigate(screen);
    },
    [navigation],
  );

  const openAddPlant = React.useCallback(() => {
    rootNavigation?.navigate(SCREENS.ADD_PLANT_STACK);
  }, [rootNavigation]);

  const openAddPlantPhotoSearch = React.useCallback(() => {
    rootNavigation?.navigate(SCREENS.ADD_PLANT_STACK, {
      params: { mode: 'search' },
      screen: SCREENS.ADD_PLANT_CAMERA,
    });
  }, [rootNavigation]);

  const openPlantSearch = React.useCallback(() => {
    rootNavigation?.navigate(SCREENS.PLANT_SEARCH);
  }, [rootNavigation]);

  const openPlantDetail = React.useCallback(
    (ownedPlantId: string) => {
      rootNavigation?.navigate(SCREENS.PLANT_DETAIL, { ownedPlantId });
    },
    [rootNavigation],
  );

  const openSpeciesInfo = React.useCallback(
    (params: SpeciesInfoParams) => {
      rootNavigation?.navigate(SCREENS.SPECIES_INFO, params);
    },
    [rootNavigation],
  );

  return {
    navigateTab,
    openAddPlant,
    openAddPlantPhotoSearch,
    openPlantDetail,
    openPlantSearch,
    openSettings,
    openSpeciesInfo,
  };
}
