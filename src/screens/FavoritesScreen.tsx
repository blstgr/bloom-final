import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PhotoGrid } from '../components/ui/PhotoGrid';
import { PlantCard } from '../components/ui/PlantCard';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { Tabs } from '../components/ui/Tabs';
import { TopActions } from '../components/ui/TopActions';
import { usePlantData } from '../features/plants/data/PlantDataProvider';
import { availableFilters, matchesFilter, type PlantFilterKey } from '../features/plants/data/plantFilters';
import type { PlantSpecies } from '../features/plants/data/types';
import {
  SCREENS,
  useIsScreenFocused,
  useTabScreenNavigation,
  type FavoritesScreenProps,
} from '../navigation';
import { useAppSelector } from '../store/hooks';
import { layout, spacing } from '../theme';

// The same top block as the Library (Figma `506:4205`): the title block's 24 bottom padding plus the
// 16 column gap down to the chips.
const TITLE_TO_CHIPS_GAP = spacing.xl + spacing.md;

export function FavoritesScreen({ navigation }: FavoritesScreenProps) {
  const { openSettings, openSpeciesInfo } = useTabScreenNavigation(navigation);
  const favorites = useAppSelector(state => state.favorites);
  const { getSpeciesById } = usePlantData();
  const [activeTab, setActiveTab] = React.useState<PlantFilterKey>('all');
  const favoritedSpecies = favorites
    .map(favorite => getSpeciesById(favorite.speciesId))
    .filter((species): species is PlantSpecies => species != null);
  // Only offer filters that match something favorited — favoriting only easy plants shouldn't
  // surface an always-empty "Moody" chip. "All" always stays.
  const availableTabs = availableFilters(favoritedSpecies);
  const effectiveActiveTab = availableTabs.some(tab => tab.key === activeTab) ? activeTab : 'all';
  const visibleSpecies = favoritedSpecies.filter(species => matchesFilter(species, effectiveActiveTab));


  // The heart nav item only exists while favorites.length > 0, so this screen has no designed
  // empty state — it's reachable empty only for an instant (e.g. unfavoriting your last plant
  // while already here), and falls back to Home rather than showing a dedicated empty screen.
  //
  // Keyed on `favorites` (the Redux list) rather than the resolved `favoritedSpecies`, so this
  // and MainTabBar's heart-item condition read the *same* value. Keying it on the resolved list
  // would mean an unresolvable species leaves the heart item visible while this screen bounces
  // straight back to Home the moment it's tapped.
  // Guarded on focus because `detachInactiveScreens={false}` keeps this screen mounted: without
  // it, unfavoriting from a plant's article fires this redirect from a screen the user isn't
  // looking at, closing the article out from under them.
  const isFocused = useIsScreenFocused();

  React.useEffect(() => {
    if (isFocused && favorites.length === 0) navigation.navigate(SCREENS.HOME);
  }, [favorites.length, isFocused, navigation]);

  return (
    <ScreenLayout
      topActions={(
        <TopActions
          mode="hero"
          onRightPress={openSettings}
          rightIcon="more"
          rightLabel="Open settings"
          title="The maybe list"
        />
      )}
      // Fixed with the title as one top block, as in the Library: the grid scrolls below the chips
      // and is cut at their edge (user request, 2026-10-04).
      pinnedHeader={(
        <View style={styles.pinnedControls}>
          <Tabs
            activeKey={effectiveActiveTab}
            edgeInset={layout.screenPadding}
            onTabPress={setActiveTab}
            tabs={availableTabs}
          />
        </View>
      )}
      scrollableContent
      stackedGap={TITLE_TO_CHIPS_GAP}
      contentLayout="start"
      contentStyle={styles.content}
      reserveBottomBarSpace>
      <PhotoGrid>
        {visibleSpecies.map(species => (
          <PlantCard
            key={species.speciesId}
            accessibilityLabel={`Open ${species.speciesName}`}
            image={species.image}
            onPress={() => {
              openSpeciesInfo({ speciesId: species.speciesId });
            }}
          />
        ))}
      </PhotoGrid>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
  },
  // The bottom padding is the gap to the grid, and the line the grid scrolls under.
  pinnedControls: {
    paddingBottom: spacing.md,
  },
});
