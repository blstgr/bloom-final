import React from 'react';
import { ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradients, layout, sizes, spacing } from '../../../theme';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { Input, type InputActions } from '../Input';
import { Touchable } from '../Touchable';

import type { DebouncedSearch, SearchStatus } from './useDebouncedSearch';

// Figma (`506:4628`): the input sits 12 above the keyboard, and 12 above the safe area at rest.
const INPUT_KEYBOARD_GAP = spacing.sm;
// Room under the last row so it can scroll clear of the docked input: the input and a gap on
// either side of it.
const GAPS_AROUND_INPUT = 2;
const RESULTS_BOTTOM_CLEARANCE = sizes.input.height + INPUT_KEYBOARD_GAP * GAPS_AROUND_INPUT;

export type SearchOverlayProps<Item> = {
  /** The input's accessible name, e.g. "Search for a plant". */
  accessibilityLabel: string;
  /** Shown when the search fails with nothing to fall back on. */
  errorText: string;
  getItemAccessibilityLabel?: (item: Item) => string;
  getItemKey: (item: Item) => string;
  getItemLabel: (item: Item) => string;
  /** The search field, so the screen can focus it once its transition has finished — see
   * `useFocusOnArrival`. The field also asks for focus on mount, which is enough on iOS. */
  inputRef?: React.Ref<TextInput>;
  /** Marks the currently chosen item (the city in use), with a check and `selected` state. */
  isItemSelected?: (item: Item) => boolean;
  /** Shown when a search settles with no matches. */
  noMatchesText: string;
  /** Leaves search: the close icon on an empty query, hardware back, the iOS swipe. */
  onClose: () => void;
  onSelect: (item: Item) => void;
  placeholder: string;
  /** What was picked before, shown until a query is long enough to search. */
  recentItems: Item[];
  /** The query and what it found, as `useDebouncedSearch` returns them. */
  search: DebouncedSearch<Item>;
};

/**
 * The one search screen, for plants and cities alike (docs/search-spec.md §1). Presentational: the
 * caller owns the query and the results (through `useDebouncedSearch`) and decides what a
 * selection does; this owns layout, the keyboard-docked input and row accessibility.
 *
 * Results read from the top; the input is docked just above the keyboard, where the thumb already
 * is. With nothing recent and nothing typed the screen is deliberately blank but for the input.
 */
export function SearchOverlay<Item>({
  accessibilityLabel,
  errorText,
  getItemAccessibilityLabel,
  getItemKey,
  getItemLabel,
  inputRef,
  isItemSelected,
  noMatchesText,
  onClose,
  onSelect,
  placeholder,
  recentItems,
  search,
}: SearchOverlayProps<Item>) {
  const { query, results, setQuery, status } = search;
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  // The input is anchored above the bottom safe area, so the keyboard only has to lift it by the
  // part of its height that rises past that inset.
  const inputDockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.value - insets.bottom) }],
  }));
  // The results grow by the same lift, so the last rows can still scroll clear of the docked input
  // while the keyboard is up.
  const keyboardSpacerStyle = useAnimatedStyle(() => ({
    height: Math.max(0, keyboard.height.value - insets.bottom),
  }));

  const inputActions = React.useMemo<InputActions>(
    () => [
      {
        accessibilityLabel: query.length > 0 ? 'Clear search' : 'Close search',
        icon: 'close',
        iconSize: 'md',
        key: 'clear-or-close',
        onPress: () => (query.length > 0 ? setQuery('') : onClose()),
      },
    ],
    [onClose, query.length, setQuery],
  );

  const section = resolveSection({ noMatchesText, errorText, recentItems, results, status });

  return (
    <LinearGradient colors={[...gradients.appBackground]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + RESULTS_BOTTOM_CLEARANCE, paddingTop: insets.top },
        ]}
        // "handled" rather than a dismiss backdrop: a tap no row claims falls to the scroll view,
        // which blurs the input itself, so the blank area dismisses the keyboard (§1.3).
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {section ? (
          <View>
            <AppText accessibilityRole="header" style={styles.heading} variant="titleS">
              {section.heading}
            </AppText>
            {section.message ? (
              <AppText style={styles.message}>{section.message}</AppText>
            ) : (
              section.items.map(item => {
                const isSelected = isItemSelected?.(item) ?? false;
                const label = getItemLabel(item);

                return (
                  <Touchable
                    accessibilityLabel={getItemAccessibilityLabel?.(item) ?? label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={getItemKey(item)}
                    onPress={() => onSelect(item)}
                    style={styles.row}>
                    <View style={styles.rowIconSlot}>
                      <Icon color={colors.icon.primary} name="search" size="sm" />
                    </View>
                    <AppText numberOfLines={1} style={styles.rowLabel}>
                      {label}
                    </AppText>
                    {isSelected ? <Icon color={colors.icon.green} name="check" size="md" /> : null}
                  </Touchable>
                );
              })
            )}
          </View>
        ) : null}
        <Reanimated.View style={keyboardSpacerStyle} />
      </ScrollView>
      <Reanimated.View
        style={[styles.inputDock, { bottom: insets.bottom + INPUT_KEYBOARD_GAP }, inputDockStyle]}>
        <Input
          accessibilityLabel={accessibilityLabel}
          actions={inputActions}
          autoFocus
          inputRef={inputRef}
          leadingIcon="search"
          onChangeText={setQuery}
          placeholder={placeholder}
          value={query}
        />
      </Reanimated.View>
    </LinearGradient>
  );
}

type Section<Item> = { heading: string; items: Item[]; message?: string };

/** Which single section is on screen. Recent items before a search, suggestions during one; a
 * message replaces the rows when a search settles with nothing to show. */
function resolveSection<Item>({
  errorText,
  noMatchesText,
  recentItems,
  results,
  status,
}: {
  errorText: string;
  noMatchesText: string;
  recentItems: Item[];
  results: Item[];
  status: SearchStatus;
}): Section<Item> | null {
  switch (status) {
    case 'idle':
      return recentItems.length > 0 ? { heading: 'Recent searches', items: recentItems } : null;
    case 'results':
      return { heading: 'Suggestions', items: results };
    case 'empty':
      return { heading: 'Suggestions', items: [], message: noMatchesText };
    case 'error':
      return { heading: 'Suggestions', items: [], message: errorText };
    case 'loading':
      // Nothing yet and nothing to keep up: the heading alone says a search is under way without
      // a spinner flashing on every keystroke.
      return { heading: 'Suggestions', items: [] };
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
  },
  heading: {
    paddingVertical: spacing.xs,
  },
  inputDock: {
    left: layout.screenPadding,
    position: 'absolute',
    right: layout.screenPadding,
  },
  message: {
    color: colors.text.muted,
    paddingVertical: spacing.xs,
  },
  // minHeight rather than height: the label scales with the OS text size (§6).
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: sizes.input.height,
  },
  // The input's leading geometry exactly: 16 inset, the 16px icon, an 8 gap. Icons and text line
  // up down the whole column, input included.
  rowIconSlot: {
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  rowLabel: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
});
