import React from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../components/ui/AppText';
import { Icon } from '../components/ui/Icon';
import { Input, type InputActions } from '../components/ui/Input';
import { Loader } from '../components/ui/Loader';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { type LocationSearchScreenProps } from '../navigation';
import type { GeoLocation } from '../services/types';
import { searchLocations } from '../services/weatherApi';
import { useAppDispatch } from '../store/hooks';
import { setSelectedLocation } from '../store/settingsSlice';
import { colors, layout, radii, sizes, spacing } from '../theme';

const PANEL_WIDTH = 327;
// Same shape as LibraryScreen's plant search: below two characters a city-name prefix matches
// too much to be worth a request.
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;
const RESULTS_TOP_GAP = spacing.xxl;
const MESSAGE_LINE_HEIGHT = 20;

function formatLocation(location: GeoLocation): string {
  // Same-named cities are common, so the region disambiguates where there is one.
  return [location.name, location.admin1, location.country].filter(Boolean).join(', ');
}

export function LocationSearchScreen({ navigation, route }: LocationSearchScreenProps) {
  const dispatch = useAppDispatch();
  const currentLocationId = route.params?.currentLocationId;

  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<GeoLocation[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const requestIdRef = React.useRef(0);

  const normalizedQuery = query.trim();
  const isSearching = normalizedQuery.length >= MIN_QUERY_LENGTH;

  React.useEffect(() => {
    if (!isSearching) {
      setResults([]);
      setHasError(false);
      setIsLoading(false);

      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    const debounceTimeout = setTimeout(() => {
      searchLocations(normalizedQuery)
        .then(matches => {
          if (requestIdRef.current !== requestId) return;
          setResults(matches);
          setHasError(false);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setResults([]);
          setHasError(true);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setIsLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounceTimeout);
  }, [isSearching, normalizedQuery]);

  const handleSelect = React.useCallback(
    (location: GeoLocation) => {
      dispatch(setSelectedLocation(location));
      navigation.goBack();
    },
    [dispatch, navigation],
  );

  const inputActions = React.useMemo<InputActions>(
    () => [
      {
        accessibilityLabel: query.length > 0 ? 'Clear location search' : 'Close location search',
        icon: 'close',
        iconSize: 'md',
        key: 'clear-or-close',
        onPress: () => (query.length > 0 ? setQuery('') : navigation.goBack()),
      },
    ],
    [navigation, query.length],
  );

  return (
    <ScreenLayout
      topActions={(
        <View style={styles.searchWrap}>
          <Input
            accessibilityLabel="Search for a city"
            actions={inputActions}
            autoFocus
            leadingIcon="search"
            onChangeText={setQuery}
            placeholder="Search for a city"
            size="large"
            value={query}
          />
        </View>
      )}
      contentStyle={[
        styles.content,
        { paddingTop: RESULTS_TOP_GAP },
      ]}
      scrollableContent
      reserveBottomBarSpace>
      <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.dismissArea}>
        <View style={styles.panel}>
          {isLoading ? (
            <View style={styles.centered}>
              <Loader size="small" />
            </View>
          ) : null}
          {!isLoading && hasError ? (
            <AppText align="center" style={styles.message}>
              Couldn't search for cities. Check your connection and try again.
            </AppText>
          ) : null}
          {!isLoading && !hasError && isSearching && results.length === 0 ? (
            <AppText align="center" style={styles.message}>
              No cities match that search.
            </AppText>
          ) : null}
          {!isLoading && results.length > 0 ? (
            <View accessibilityLabel="City suggestions" style={styles.results}>
              <View style={styles.headingRow}>
                <AppText variant="titleS">Suggestions</AppText>
              </View>
              {results.map(location => {
                const isCurrent = location.locationId === currentLocationId;

                return (
                  <Pressable
                    accessibilityLabel={formatLocation(location)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isCurrent }}
                    key={location.locationId}
                    onPress={() => handleSelect(location)}
                    style={styles.resultRow}>
                    <Icon color={colors.icon.primary} name="search" size="md" />
                    <AppText>{formatLocation(location)}</AppText>
                    {isCurrent ? <Icon color={colors.icon.green} name="check" size="md" /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </Pressable>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  dismissArea: {
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  headingRow: {
    height: sizes.input.height,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  message: {
    lineHeight: MESSAGE_LINE_HEIGHT,
  },
  panel: {
    alignItems: 'center',
    gap: spacing.md,
    width: PANEL_WIDTH,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    height: sizes.input.height,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  results: {
    borderRadius: radii.lg,
    width: '100%',
  },
  searchWrap: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    width: PANEL_WIDTH,
  },
});
