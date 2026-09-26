import React from 'react';

import { NavBar, type NavItem } from '../components/ui/NavBar';
import { usePlantData } from '../features/plants/data/PlantDataProvider';
import { isWateringDue } from '../features/plants/data/schedule';
import { useEffectiveWateringInterval } from '../features/weather/useEffectiveWateringInterval';
import { useAppSelector } from '../store/hooks';

import { SCREENS } from './constants';
import type { TabParamList } from './types';

type MainTabBarProps = {
  /** Undefined when the active route is not one of the tabs — no item is highlighted. */
  activeScreen?: keyof TabParamList;
  onAddPlant: () => void;
  onNavigate: (screen: keyof TabParamList) => void;
};

type MainTabBarItemKey = keyof TabParamList | typeof SCREENS.ADD_PLANT_STACK;

export function MainTabBar({
  activeScreen,
  onAddPlant,
  onNavigate,
}: MainTabBarProps) {
  const { getSpeciesById, ownedPlants } = usePlantData();
  const favoritesCount = useAppSelector(state => state.favorites.length);
  const getEffectiveInterval = useEffectiveWateringInterval();
  const dueCount = ownedPlants.filter(ownedPlant => {
    const species = getSpeciesById(ownedPlant.speciesId);
    return (
      species != null &&
      isWateringDue(ownedPlant, species, undefined, getEffectiveInterval(species))
    );
  }).length;
  const navItems = React.useMemo<NavItem<MainTabBarItemKey>[]>(() => {
    const items: NavItem<MainTabBarItemKey>[] = [
      {
        accessibilityLabel: 'Home',
        icon: 'home',
        key: SCREENS.HOME,
        onPress: () => onNavigate(SCREENS.HOME),
      },
      {
        accessibilityLabel: 'Add plant',
        icon: 'plus',
        key: SCREENS.ADD_PLANT_STACK,
        onPress: onAddPlant,
      },
      {
        accessibilityLabel: 'plant wiki',
        icon: 'library',
        key: SCREENS.LIBRARY,
        onPress: () => onNavigate(SCREENS.LIBRARY),
      },
    ];

    if (favoritesCount > 0) {
      items.push({
        accessibilityLabel: 'Favorites',
        icon: 'heart',
        key: SCREENS.FAVORITES,
        onPress: () => onNavigate(SCREENS.FAVORITES),
      });
    }

    items.push({
      accessibilityLabel: 'Water',
      badgeCount: dueCount > 0 ? dueCount : undefined,
      icon: 'water',
      key: SCREENS.WATER,
      onPress: () => onNavigate(SCREENS.WATER),
    });

    return items;
  }, [dueCount, favoritesCount, onAddPlant, onNavigate]);

  return <NavBar activeKey={activeScreen} items={navItems} />;
}
