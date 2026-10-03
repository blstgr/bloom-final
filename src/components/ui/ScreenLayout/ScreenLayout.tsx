import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gradients, layout, sizes, spacing } from '../../../theme';

const FLOATING_BOTTOM_ACTION_RESERVED_HEIGHT = sizes.nav.item;
/**
 * Breathing room between the last scrollable item and the floating bar above it.
 *
 * Its own constant rather than `stackedGap`, which this used to borrow: `stackedGap` means "gap
 * around a non-overlay content block" and screens set it for reasons that have nothing to do with
 * the bar. LibraryScreen set it to 16 for its own layout and silently got 16px less clearance
 * than every other tab screen as a result.
 */
const FLOATING_BOTTOM_ACTION_CLEARANCE = spacing.xxl;
const OVERLAY_Z_INDEX = 2;

export type ScreenContentLayout =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'split-center';

type ScreenLayoutBaseProps = {
  bottomActions?: React.ReactNode;
  /**
   * Whether bottomActions floats over the content (persistent tab bar, meant to
   * overlap scrollable content behind its frosted glass) or sits in normal flow
   * below it (single-purpose action button/CTA, never overlapping content).
   */
  bottomActionsOverlay?: boolean;
  children: React.ReactNode;
  /**
   * Shared vertical behavior for the content area. `split-center` keeps the first
   * child fixed at the top and centers the remaining children in the leftover space.
   */
  contentLayout?: ScreenContentLayout;
  contentStyle?: StyleProp<ViewStyle>;
  horizontalPadding?: boolean;
  /** Vertical gap around a non-overlay content block (topActions↔content, content↔bottomActions). */
  stackedGap?: number;
  topActions?: React.ReactNode;
  topActionsOverlay?: boolean;
};

type ScrollableScreenLayoutProps = ScreenLayoutBaseProps & {
  /**
   * Wraps children in a ScrollView instead of a fixed View. Use when content can exceed the
   * screen (e.g. a variable-length list) — leave false for content designed to fit one screen.
   */
  scrollableContent: true;
  /**
   * For titled scroll screens: splits the top gap into fixed + scrollable parts.
   * At rest it preserves the normal 32px rhythm; after scrolling, 16px remains.
   */
  scrollableContentSharesTopGap?: boolean;
  /** Children pinned to the top of the scroll area once scrolled to, with the rest of the content
   * passing behind them (ScrollView's sticky headers). Indexes into this screen's children. */
  stickyHeaderIndices?: number[];
} & (
  | {
      /**
       * Reserve room at the bottom for a floating bar this screen does *not* render itself — the
       * tab bar supplied by the navigator. Reserving space and owning the bar are separate
       * concerns: `bottomActions` does both, this does only the first, so scrollable content
       * still clears the bar instead of vanishing behind it.
       *
       * Mutually exclusive with `bottomActions`: a screen that renders its own bottom slot is
       * already reserving for it, and doing both would reserve one inset for two bars.
       */
      reserveBottomBarSpace: true;
      bottomActions?: never;
      bottomActionsOverlay?: never;
    }
  | { reserveBottomBarSpace?: false }
);

type StaticScreenLayoutProps = ScreenLayoutBaseProps & {
  scrollableContent?: false;
  scrollableContentSharesTopGap?: never;
  stickyHeaderIndices?: never;
  /**
   * Only meaningful on a scrollable screen: the reserve is scroll-content padding, and a static
   * screen has no scroll content to pad. Declared `never` so setting it is a compile error rather
   * than a prop that silently does nothing.
   */
  reserveBottomBarSpace?: never;
};

export type ScreenLayoutProps = ScrollableScreenLayoutProps | StaticScreenLayoutProps;

export function ScreenLayout({
  bottomActions,
  bottomActionsOverlay = true,
  children,
  contentLayout = 'start',
  contentStyle,
  horizontalPadding = false,
  reserveBottomBarSpace = false,
  scrollableContent = false,
  scrollableContentSharesTopGap = false,
  stackedGap = spacing.xxl,
  stickyHeaderIndices,
  topActions,
  topActionsOverlay = false,
}: ScreenLayoutProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const isOverlay = bottomActions != null && bottomActionsOverlay;
  const isStacked = bottomActions != null && !bottomActionsOverlay;
  // A floating bar needs the same bottom inset whether this screen renders it or the navigator
  // does; only the rendering below is conditional on owning it.
  const reservesFloatingBottomSpace = isOverlay || reserveBottomBarSpace;
  const contentContainerProps = scrollableContent
    ? {
        contentInsetAdjustmentBehavior: 'never' as const,
        // Lets a tap on a row under a focused input (e.g. search suggestions/history) register
        // its own onPress instead of the ScrollView blurring the input first and unmounting the
        // row out from under the touch.
        keyboardShouldPersistTaps: 'handled' as const,
        showsVerticalScrollIndicator: false,
      }
    : {};
  const rootStyle: StyleProp<ViewStyle> = [
    styles.root,
    {
      paddingTop: topActionsOverlay ? 0 : safeAreaInsets.top,
    },
  ];
  const topActionsGap = scrollableContent && scrollableContentSharesTopGap ? spacing.md : stackedGap;
  const topActionsStyle: StyleProp<ViewStyle> = [styles.topActions, { marginBottom: topActionsGap }];
  const contentLayoutStyle = getContentLayoutStyle(
    contentLayout,
  );
  const scrollBottomInsetStyle =
    scrollableContent && reservesFloatingBottomSpace
      ? {
          paddingBottom:
            safeAreaInsets.bottom +
            FLOATING_BOTTOM_ACTION_RESERVED_HEIGHT +
            FLOATING_BOTTOM_ACTION_CLEARANCE,
        }
      : null;
  const scrollSharedTopGapStyle =
    scrollableContent && scrollableContentSharesTopGap
      ? { paddingTop: spacing.md }
      : null;
  const bottomActionsStackedStyle: StyleProp<ViewStyle> = [
    styles.bottomActionsStacked,
    { paddingBottom: safeAreaInsets.bottom, paddingTop: stackedGap },
  ];
  const topActionsOverlayStyle: StyleProp<ViewStyle> = [
    styles.topActionsOverlay,
    { top: safeAreaInsets.top },
  ];
  const bottomActionsOverlayStyle: StyleProp<ViewStyle> = [
    styles.bottomActionsOverlay,
    { bottom: safeAreaInsets.bottom },
  ];

  return (
    <LinearGradient colors={[...gradients.appBackground]} style={styles.screen}>
      <View style={rootStyle}>
        {topActions && !topActionsOverlay ? (
          <View style={topActionsStyle}>{topActions}</View>
        ) : null}
        {scrollableContent ? (
          <ScrollView
            {...contentContainerProps}
            stickyHeaderIndices={stickyHeaderIndices}
            style={styles.content}
            contentContainerStyle={[
              styles.scrollContent,
              contentLayoutStyle,
              horizontalPadding && styles.horizontalPadding,
              scrollBottomInsetStyle,
              scrollSharedTopGapStyle,
              contentStyle,
            ]}>
            {renderContentChildren(children, contentLayout)}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.content,
              contentLayoutStyle,
              horizontalPadding && styles.horizontalPadding,
              contentStyle,
            ]}>
            {renderContentChildren(children, contentLayout)}
          </View>
        )}
        {isStacked ? (
          <View style={bottomActionsStackedStyle}>{bottomActions}</View>
        ) : null}
      </View>
      {topActions && topActionsOverlay ? (
        <View style={topActionsOverlayStyle}>{topActions}</View>
      ) : null}
      {isOverlay ? (
        <View style={bottomActionsOverlayStyle}>{bottomActions}</View>
      ) : null}
    </LinearGradient>
  );
}

function getContentLayoutStyle(
  contentLayout: ScreenContentLayout,
): StyleProp<ViewStyle> {
  switch (contentLayout) {
    case 'center':
      return styles.contentCenter;
    case 'end':
      return styles.contentEnd;
    case 'space-between':
      return styles.contentSpaceBetween;
    case 'split-center':
      return styles.contentSplitCenter;
    default:
      return null;
  }
}

function renderContentChildren(
  children: React.ReactNode,
  contentLayout: ScreenContentLayout,
) {
  if (contentLayout !== 'split-center') return children;

  const childArray = React.Children.toArray(children);
  const [topChild, ...centerChildren] = childArray;

  return (
    <>
      {topChild ? <View style={styles.splitTop}>{topChild}</View> : null}
      <View style={styles.splitCenter}>{centerChildren}</View>
    </>
  );
}

const styles = StyleSheet.create({
  bottomActionsOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: OVERLAY_Z_INDEX,
  },
  bottomActionsStacked: {
    width: '100%',
  },
  content: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  contentCenter: {
    justifyContent: 'center',
  },
  contentEnd: {
    justifyContent: 'flex-end',
  },
  contentSpaceBetween: {
    justifyContent: 'space-between',
  },
  contentSplitCenter: {
    gap: spacing.xl,
    paddingTop: spacing.xl,
  },
  horizontalPadding: {
    paddingHorizontal: layout.screenPadding,
  },
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  splitCenter: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  splitTop: {
    width: '100%',
  },
  topActions: {
    paddingHorizontal: layout.screenPadding,
  },
  topActionsOverlay: {
    left: 0,
    paddingHorizontal: layout.screenPadding,
    position: 'absolute',
    right: 0,
    zIndex: OVERLAY_Z_INDEX,
  },
});
