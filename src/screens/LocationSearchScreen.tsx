import React from 'react';

import { SearchOverlay, useDebouncedSearch } from '../components/ui/SearchOverlay';
import { useFocusOnArrival, type LocationSearchScreenProps } from '../navigation';
import type { GeoLocation } from '../services/types';
import { searchLocations } from '../services/weatherApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSelectedLocation } from '../store/settingsSlice';

// Open-Meteo's geocoder answers nothing for two letters ("Ky" finds no Kyiv), so two letters would
// only ever produce a false "no cities match".
const MIN_CITY_QUERY_LENGTH = 3;

const getKey = (location: GeoLocation) => location.locationId;
const getLabel = (location: GeoLocation) => location.name;
/** What a screen reader announces. Same-named cities are common, so the region and country
 * disambiguate — the sighted reader has the surrounding list for that, a listener does not. */
const describeLocation = (location: GeoLocation) =>
  [location.name, location.admin1, location.country].filter(Boolean).join(', ');

/**
 * City search, opened from Settings' location row (docs/search-spec.md §1). The same screen as
 * plant search, with cities in it.
 */
export function LocationSearchScreen({ navigation, route }: LocationSearchScreenProps) {
  const dispatch = useAppDispatch();
  const recentLocations = useAppSelector(state => state.settings.recentLocations);
  const currentLocationId = route.params?.currentLocationId;
  const inputRef = useFocusOnArrival(navigation);
  const search = useDebouncedSearch({ minQueryLength: MIN_CITY_QUERY_LENGTH, search: searchLocations });

  const isCurrent = React.useCallback(
    (location: GeoLocation) => location.locationId === currentLocationId,
    [currentLocationId],
  );
  const handleSelect = React.useCallback(
    (location: GeoLocation) => {
      dispatch(setSelectedLocation(location));
      navigation.goBack();
    },
    [dispatch, navigation],
  );

  return (
    <SearchOverlay
      accessibilityLabel="Search for a city"
      errorText="Couldn't search for cities. Check your connection and try again."
      getItemAccessibilityLabel={describeLocation}
      getItemKey={getKey}
      getItemLabel={getLabel}
      inputRef={inputRef}
      isItemSelected={isCurrent}
      noMatchesText="No cities match that search."
      onClose={navigation.goBack}
      onSelect={handleSelect}
      placeholder="Search city"
      recentItems={recentLocations}
      search={search}
    />
  );
}
