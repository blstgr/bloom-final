import React from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Input, type InputActions } from '../components/ui/Input';
import { Loader } from '../components/ui/Loader';
import {
  FLOATING_BOTTOM_ACTION_RESERVED_HEIGHT,
  ScreenLayout,
} from '../components/ui/ScreenLayout';
import { TopActions } from '../components/ui/TopActions';
import { usePlantData } from '../features/plants/data/PlantDataProvider';
import {
  mergeSearchResults,
  searchSeedSpecies,
  type SpeciesSearchResult,
  searchSpeciesByRelevance,
} from '../features/plants/data/speciesSearch';
import type { PlantSpecies } from '../features/plants/data/types';
import { type LibraryScreenProps, useTabScreenNavigation } from '../navigation';
import { colors, layout, radii, sizes, spacing } from '../theme';

const LIBRARY_PANEL_WIDTH = 327;
// Matches EmptyState's subtitle so both read as the same kind of secondary copy.
const SEARCH_MESSAGE_LINE_HEIGHT = 20;
// Gap between the search bar and the navigator's floating tab bar, which it sits above.
const SEARCH_BAR_NAV_BAR_GAP = spacing.md;
// Gap between the search bar and the keyboard once it is up.
const SEARCH_BAR_KEYBOARD_GAP = spacing.xs;
const SEARCH_BAR_BOTTOM_OFFSET =
  FLOATING_BOTTOM_ACTION_RESERVED_HEIGHT + SEARCH_BAR_NAV_BAR_GAP;
// Only applies while results or history are showing; the empty state must keep the same
// content box as Home and Water so the tab cross-fade does not make the block jump.
const SEARCH_RESULTS_TOP_GAP = spacing.xxl;
// Standard search-as-you-type practice (Google, GitHub, etc). Below this, Perenual's substring
// match is too broad to be useful — nearly every name contains any single common letter somewhere.
const MIN_SEARCH_QUERY_LENGTH = 2;
// Delays the actual Perenual request until typing pauses, so a full word costs one request
// instead of one per keystroke — Perenual's free-tier daily cap is easy to exhaust otherwise.
const SEARCH_DEBOUNCE_MS = 350;

type SearchViewState = 'error' | 'history' | 'idle' | 'loading' | 'no-matches' | 'results';

function getSearchViewState({
  hasResults,
  isLoadingRemote,
  isSearching,
  searchError,
  showList,
}: {
  hasResults: boolean;
  isLoadingRemote: boolean;
  isSearching: boolean;
  searchError: boolean;
  showList: boolean;
}): SearchViewState {
  if (!showList) return 'idle';
  if (!isSearching) return 'history';
  if (searchError) return 'error';
  if (hasResults) return 'results';
  if (isLoadingRemote) return 'loading';

  return 'no-matches';
}

export function LibraryScreen({ navigation }: LibraryScreenProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { openAddPlantPhotoSearch, openSettings, openSpeciesInfo } =
    useTabScreenNavigation(navigation);
  const {
    addSearchHistoryEntry,
    pendingLibrarySearch,
    searchHistory,
    setPendingLibrarySearch,
  } = usePlantData();
  const [query, setQuery] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);
  const [results, setResults] = React.useState<SpeciesSearchResult[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = React.useState(false);
  const [searchError, setSearchError] = React.useState(false);
  const searchRequestIdRef = React.useRef(0);
  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH;
  const showHistory = !isSearching && isFocused && searchHistory.length > 0;
  const showList = isSearching || showHistory;

  React.useEffect(() => {
    if (pendingLibrarySearch == null) return;
    setQuery(pendingLibrarySearch);
    setPendingLibrarySearch(null);
  }, [pendingLibrarySearch, setPendingLibrarySearch]);
  // Reset once this tab regains focus (e.g. closing the species wiki page), rather than the
  // moment a result is selected — clearing it immediately flashed the idle icon/title/subtitle
  // behind the new screen while it was still transitioning in.
  React.useEffect(
    () =>
      navigation.addListener?.('focus', () => {
        if (pendingLibrarySearch == null) {
          setQuery('');
        }
      }),
    [navigation, pendingLibrarySearch],
  );

  React.useEffect(() => {
    if (!isSearching) {
      setResults([]);
      setSearchError(false);
      setIsLoadingRemote(false);
      return undefined;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    // Fill the list from the curated seed species straight away. Perenual takes 1-3s, and for a
    // query the seed set covers this means the user sees an answer while that is still in flight.
    const seedResults = searchSeedSpecies(normalizedQuery);
    setResults(seedResults);
    setSearchError(false);
    setIsLoadingRemote(true);

    const debounceTimeout = setTimeout(() => {
      searchSpeciesByRelevance(normalizedQuery)
        .then(remoteResults => {
          if (searchRequestIdRef.current !== requestId) return;
          setResults(mergeSearchResults(seedResults, remoteResults));
          setSearchError(false);
          setIsLoadingRemote(false);
        })
        .catch(() => {
          if (searchRequestIdRef.current !== requestId) return;
          setIsLoadingRemote(false);
          // Seed matches are still valid answers, so only surface the failure when the remote
          // call was the only thing that could have produced results.
          if (seedResults.length === 0) {
            setResults([]);
            setSearchError(true);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounceTimeout);
  }, [isSearching, normalizedQuery]);

  const handleOpenSpecies = React.useCallback(
    (species: PlantSpecies) => {
      addSearchHistoryEntry(species);
      openSpeciesInfo({ speciesId: species.speciesId });
    },
    [addSearchHistoryEntry, openSpeciesInfo],
  );
  // Navigates immediately rather than waiting for the full species (facts, photo, generated
  // copy) to resolve first — SpeciesInfoScreen resolves it in place and shows its own loading
  // state there, which reads as "this article is loading" rather than an unexplained delay/lag
  // before the tap even seems to register.
  const handleSelectSearchResult = React.useCallback(
    (item: SpeciesSearchResult) => {
      openSpeciesInfo({ speciesId: item.speciesId, speciesName: item.speciesName });
    },
    [openSpeciesInfo],
  );
  const inputActions = React.useMemo<InputActions>(
    () => [
      query.length > 0
        ? {
            accessibilityLabel: 'Clear plant search',
            icon: 'close',
            iconSize: 'md',
            key: 'clear-search',
            onPress: () => setQuery(''),
          }
        : {
            accessibilityLabel: 'Search plant by photo',
            icon: 'camera',
            iconSize: 'md',
            key: 'search-by-photo',
            onPress: openAddPlantPhotoSearch,
          },
    ],
    [openAddPlantPhotoSearch, query.length],
  );

  // The search bar is a single mounted Input in the bottom overlay — moving it between two
  // places in the tree would unmount it and drop focus mid-typing. Instead the empty state
  // reserves a same-sized slot in its own column, and the bar is translated onto it.
  const [searchSlotTop, setSearchSlotTop] = React.useState<number | null>(null);
  const searchBarSlot = React.useMemo(
    () => ({ height: sizes.input.heightLarge, onLayout: setSearchSlotTop }),
    [],
  );
  // How far above its anchor the bar must sit to land on that slot. Falls back to parking above
  // the floating tab bar whenever no slot is on screen (i.e. a list replaced the empty state).
  // Five mutually exclusive displays, resolved once rather than as a nested ternary cascade in
  // the render body.
  const searchViewState = getSearchViewState({
    hasResults: results.length > 0,
    isLoadingRemote,
    isSearching,
    searchError,
    showList,
  });

  // `searchSlotTop` survives the empty state unmounting, so a list replacing it must fall back
  // explicitly — otherwise the bar keeps the stale mid-screen slot and floats above the results.
  const restingOffset =
    showList || searchSlotTop == null
      ? SEARCH_BAR_BOTTOM_OFFSET
      : windowHeight - searchSlotTop - sizes.input.heightLarge - insets.bottom;

  const keyboard = useAnimatedKeyboard();
  // Closed: park the bar above the navigator's floating tab bar. Open: sit just above the
  // keyboard, which already covers that bar. The overlay container is anchored at the bottom
  // safe-area inset, so the keyboard travel is measured from there.
  // Whichever is higher wins: the resting slot, or clearing the keyboard. When the empty state
  // is on screen its slot already sits above the keyboard, so the bar stays put; when a list
  // replaced it, the fallback is below the keyboard and the bar rises to meet it.
  const searchBarStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: -Math.max(
          keyboard.height.value - insets.bottom + SEARCH_BAR_KEYBOARD_GAP,
          restingOffset,
        ),
      },
    ],
  }));

  return (
    <ScreenLayout
      topActions={(
        <TopActions
          mode="centered"
          onRightPress={openSettings}
          rightIcon="more"
          rightLabel="Open settings"
        />
      )}
      bottomActions={(
        <Animated.View style={[styles.searchWrap, searchBarStyle]}>
          <Input
            accessibilityLabel="Search plant wiki"
            actions={inputActions}
            leadingIcon="search"
            onBlur={() => setIsFocused(false)}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            size="large"
            value={query}
          />
        </Animated.View>
      )}
      contentStyle={[
        styles.content,
        // Only while a list is showing. The empty state deliberately gets no extra top
        // padding, so its content box matches Home's and Water's and the block does not
        // move during the tab cross-fade.
        showList && {
          paddingTop: insets.top + SEARCH_RESULTS_TOP_GAP,
          // ScreenLayout reserves for one floating bar; this screen stacks its search bar above
          // the navigator's, so the last rows would otherwise scroll under it unreserved.
          paddingBottom:
            insets.bottom + SEARCH_BAR_BOTTOM_OFFSET + sizes.input.heightLarge + spacing.md,
        },
      ]}
      scrollableContent
      topActionsOverlay>
      <Pressable
        accessible={false}
        onPress={Keyboard.dismiss}
        style={[styles.dismissArea, !showList && styles.dismissAreaCentered]}>
        {searchViewState === 'idle' ? (
          // Rendered outside libraryPanel: that panel's fixed width is the search bar's, and
          // constraining the empty state to it forced "Potential Victims" onto two lines while
          // Home's title had the full content width.
          <EmptyState
            icon="sun"
            slot={searchBarSlot}
            subtitle="Search any plant to see if it is ready for you... and if you are ready for it."
            title="Potential Victims"
          />
        ) : (
          <View style={styles.libraryPanel}>
            {searchViewState === 'history' ? (
              <SearchResultSection
                heading="History"
                items={searchHistory}
                keyExtractor={item => item.speciesId}
                labelExtractor={item => item.speciesName}
                onSelect={handleOpenSpecies}
              />
            ) : null}
            {searchViewState === 'results' ? (
              <SearchResultSection
                heading="Suggestions"
                items={results}
                keyExtractor={item => item.speciesId}
                labelExtractor={item => item.speciesName}
                onSelect={handleSelectSearchResult}
              />
            ) : null}
            {searchViewState === 'loading' ? (
              // Perenual's response time swings between roughly one and three seconds, so
              // showing nothing here reads as the app having ignored the keystroke.
              <View style={styles.searchLoading}>
                <Loader size="small" />
              </View>
            ) : null}
            {searchViewState === 'no-matches' ? (
              <AppText align="center" style={styles.searchMessage}>
                No plants match that search.
              </AppText>
            ) : null}
            {searchViewState === 'error' ? (
              <AppText align="center" style={styles.searchMessage}>
                Couldn't load search results. Check your connection and try again.
              </AppText>
            ) : null}
          </View>
        )}
      </Pressable>
    </ScreenLayout>
  );
}

function SearchResultSection<Item>({
  heading,
  items,
  keyExtractor,
  labelExtractor,
  onSelect,
}: {
  heading: string;
  items: Item[];
  keyExtractor: (item: Item) => string;
  labelExtractor: (item: Item) => string;
  onSelect: (item: Item) => void;
}) {
  return (
    <View accessibilityLabel={`Plant wiki ${heading.toLowerCase()}`} style={styles.results}>
      <View style={styles.resultsHeadingRow}>
        <AppText variant="titleS">{heading}</AppText>
      </View>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={`Open ${labelExtractor(item)}`}
            accessibilityRole="button"
            onPress={() => onSelect(item)}
            style={styles.resultRow}>
            <Icon color={colors.icon.primary} name="search" size="sm" />
            <AppText>{labelExtractor(item)}</AppText>
          </Pressable>
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  dismissArea: {
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  dismissAreaCentered: {
    justifyContent: 'center',
  },
  libraryPanel: {
    alignItems: 'center',
    gap: spacing.md,
    width: LIBRARY_PANEL_WIDTH,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    height: sizes.input.height,
    paddingHorizontal: spacing.md,
  },
  results: {
    borderRadius: radii.lg,
    width: '100%',
  },
  resultsHeadingRow: {
    height: sizes.input.height,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  searchLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    width: '100%',
  },
  searchMessage: {
    lineHeight: SEARCH_MESSAGE_LINE_HEIGHT,
  },
  searchWrap: {
    alignSelf: 'center',
    width: LIBRARY_PANEL_WIDTH,
  },
});
