import React from 'react';

import { SearchOverlay, useDebouncedSearch } from '../components/ui/SearchOverlay';
import { usePlantData } from '../features/plants/data/PlantDataProvider';
import {
  mergeSearchResults,
  searchSeedSpecies,
  searchSpeciesByRelevance,
  type SpeciesSearchResult,
} from '../features/plants/data/speciesSearch';
import { SCREENS, type PlantSearchScreenProps, useFocusOnArrival } from '../navigation';

const getKey = (item: SpeciesSearchResult) => item.speciesId;
const getLabel = (item: SpeciesSearchResult) => item.speciesName;
const getAccessibilityLabel = (item: SpeciesSearchResult) => `Open ${item.speciesName}`;
const SHIPPED_SPECIES_FIRST = { merge: mergeSearchResults, results: searchSeedSpecies };

/**
 * Plant search, opened from the Library search bar (docs/search-spec.md §1).
 *
 * Shipped species answer instantly; Perenual's results merge in behind them. Selecting replaces
 * this screen with the species article, so closing the article returns to the Library rather than
 * to a half-typed search.
 */
export function PlantSearchScreen({ navigation }: PlantSearchScreenProps) {
  const { addSearchHistoryEntry, getSpeciesById, searchHistory } = usePlantData();
  const inputRef = useFocusOnArrival(navigation);
  const search = useDebouncedSearch({
    instant: SHIPPED_SPECIES_FIRST,
    search: searchSpeciesByRelevance,
  });
  const recentItems = React.useMemo(
    () => searchHistory.map(species => ({ speciesId: species.speciesId, speciesName: species.speciesName })),
    [searchHistory],
  );

  // Navigates at once rather than waiting for the species to resolve: SpeciesInfoScreen resolves
  // it in place with its own loading state, so the tap never seems ignored.
  //
  // A shipped species is complete already, so it goes into recent searches now; a remote one is
  // recorded by SpeciesInfoScreen once it has resolved.
  const handleSelect = React.useCallback(
    (item: SpeciesSearchResult) => {
      const shipped = getSpeciesById(item.speciesId);
      if (shipped) addSearchHistoryEntry(shipped);
      navigation.replace(SCREENS.SPECIES_INFO, { speciesId: item.speciesId, speciesName: item.speciesName });
    },
    [addSearchHistoryEntry, getSpeciesById, navigation],
  );

  return (
    <SearchOverlay
      accessibilityLabel="Search for a plant"
      errorText="Couldn't load search results. Check your connection and try again."
      getItemAccessibilityLabel={getAccessibilityLabel}
      getItemKey={getKey}
      getItemLabel={getLabel}
      inputRef={inputRef}
      noMatchesText="No plants match that search."
      onClose={navigation.goBack}
      onSelect={handleSelect}
      placeholder="Search plant"
      recentItems={recentItems}
      search={search}
    />
  );
}
