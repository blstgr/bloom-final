import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Input, type InputActions } from '../components/ui/Input';
import { PhotoGrid } from '../components/ui/PhotoGrid';
import { PlantCard } from '../components/ui/PlantCard';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { Tabs } from '../components/ui/Tabs';
import { TopActions } from '../components/ui/TopActions';
import { matchesFilter, PLANT_FILTERS, type PlantFilterKey } from '../features/plants/data/plantFilters';
import type { PlantSpecies } from '../features/plants/data/types';
import { usePopularPlants } from '../features/plants/data/usePopularPlants';
import { type LibraryScreenProps, useTabScreenNavigation } from '../navigation';
import { layout, spacing } from '../theme';

// Figma `506:4205`: the title block's own 24 bottom padding plus the 16 column gap.
const TITLE_TO_SEARCH_GAP = spacing.xl + spacing.md;
// The search bar and chips, as one block: the first child of the scroll content.
const STICKY_CONTROLS_INDEX = [0];

/**
 * The Library: popular indoor plants for the user's climate, filterable, with search one tap away
 * (docs/search-spec.md §2). Never empty — with no location the grid is the ten most popular.
 */
export function LibraryScreen({ navigation }: LibraryScreenProps) {
  const { openAddPlantPhotoSearch, openPlantSearch, openSettings, openSpeciesInfo } =
    useTabScreenNavigation(navigation);
  const plants = usePopularPlants();
  const [activeFilter, setActiveFilter] = React.useState<PlantFilterKey>('all');
  // Every chip, always (docs/search-spec.md §3.2 gives hiding empty chips to Favorites only), so the
  // row never shifts under a finger when a climate arrives and re-ranks the grid. No chip comes up
  // empty: each matches something in both lists the grid can show (plantFilters.test.ts).
  const visiblePlants = plants.filter(species => matchesFilter(species, activeFilter));

  const searchActions = React.useMemo<InputActions>(
    () => [
      {
        accessibilityLabel: 'Search plant by photo',
        icon: 'camera',
        iconSize: 'md',
        key: 'search-by-photo',
        onPress: openAddPlantPhotoSearch,
      },
    ],
    [openAddPlantPhotoSearch],
  );

  return (
    <ScreenLayout
      contentStyle={styles.content}
      reserveBottomBarSpace
      scrollableContent
      stickyHeaderIndices={STICKY_CONTROLS_INDEX}
      stackedGap={TITLE_TO_SEARCH_GAP}
      topActions={(
        <TopActions
          mode="hero"
          onRightPress={openSettings}
          rightIcon="more"
          rightLabel="Open settings"
          title="Potential victims"
        />
      )}>
      {/* Pinned once scrolled to: the grid passes behind the search bar and chips, showing through
          the glass and the gaps between them, rather than the two scrolling away. */}
      <View style={styles.stickyControls}>
        <Input
          accessibilityLabel="Search for a plant"
          actions={searchActions}
          leadingIcon="search"
          onPress={openPlantSearch}
          placeholder="Search plant"
        />
        <Tabs
          activeKey={activeFilter}
          edgeInset={layout.screenPadding}
          onTabPress={setActiveFilter}
          tabs={PLANT_FILTERS}
        />
      </View>
      <PhotoGrid>
        {visiblePlants.map(species => (
          <LibraryPlantCard key={species.speciesId} onOpen={openSpeciesInfo} species={species} />
        ))}
      </PhotoGrid>
    </ScreenLayout>
  );
}

/** Holds a stable press handler per plant, so the memoized PlantCard skips re-rendering when the
 * grid re-renders for a filter change. */
function LibraryPlantCard({
  onOpen,
  species,
}: {
  onOpen: (params: { speciesId: string }) => void;
  species: PlantSpecies;
}) {
  const handlePress = React.useCallback(
    () => onOpen({ speciesId: species.speciesId }),
    [onOpen, species.speciesId],
  );

  return (
    <PlantCard
      accessibilityLabel={`Open ${species.speciesName}`}
      image={species.image}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  stickyControls: {
    gap: spacing.md,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
  },
});
