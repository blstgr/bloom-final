import React from 'react';
import { Platform, ScrollView, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Reanimated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, durations, radii, sizes, spacing } from '../../../theme';
import { AppText } from '../AppText';
import { GlassView } from '../GlassView';
import { useSlidingIndicator } from '../SlidingIndicator';
import { Touchable, type TouchableRipple } from '../Touchable';

// Figma `506:4226`: 11 either side of the label. Not a spacing token — it is what centres a
// 17/26 label in a chip whose height is the 44pt tap minimum, not a rhythm value.
const TAB_HORIZONTAL_PADDING = 11;
// A ripple on Android; nothing extra on iOS, where the chip's press-scale is the feedback. The iOS
// fade would dim the glass's parent, and Liquid Glass breaks under any superview alpha below 1.
const CHIP_PRESS_FEEDBACK: TouchableRipple = Platform.OS === 'android' ? 'bounded' : 'none';
const TAB_RESTING_SCALE = 1;
const TAB_PRESSED_SCALE = 0.94;
const ACTIVE = 1;
const INACTIVE = 0;
const PRESSED = 1;
const RELEASED = 0;

const ReanimatedAppText = Reanimated.createAnimatedComponent(AppText);

export type TabItem<Key extends string = string> = {
  key: Key;
  label: string;
};

export type TabsProps<Key extends string = string> = {
  // `NoInfer` keeps `tabs` as the only source of `Key`. Without it, passing an `activeKey` that
  // isn't one of the tab keys just widens `Key` to include it instead of failing to compile —
  // which silently yields a tab bar with nothing selected.
  activeKey: NoInfer<Key>;
  /** The horizontal padding of the column the row sits in. The row bleeds through it to the screen
   * edges, so chips scroll off the edge of the screen rather than being cut at the padding, while
   * the first chip still lines up with the column at rest. */
  edgeInset?: number;
  onTabPress: (key: NoInfer<Key>) => void;
  tabs: TabItem<Key>[];
};

type TabButtonProps<Key extends string> = {
  isActive: boolean;
  label: string;
  onLayout: (key: Key, event: LayoutChangeEvent) => void;
  onTabPress: (key: Key) => void;
  tabKey: Key;
};

/** One tab. Split out of `Tabs` because each tab owns its own shared values, and hooks can't be
 * called from inside the `tabs.map()` loop. */
function TabButton<Key extends string>({
  isActive,
  label,
  onLayout,
  onTabPress,
  tabKey,
}: TabButtonProps<Key>) {
  const activeProgress = useSharedValue(isActive ? ACTIVE : INACTIVE);
  const pressProgress = useSharedValue(RELEASED);

  React.useEffect(() => {
    activeProgress.value = withTiming(isActive ? ACTIVE : INACTIVE, {
      duration: durations.indicatorCrossFadeMs,
    });
  }, [activeProgress, isActive]);

  const pressStyle = useAnimatedStyle(() => ({
    // Clamped because `withSpring` overshoots both ends by default: unclamped, the tab would dip
    // past TAB_PRESSED_SCALE on press and settle larger than its resting size on release.
    transform: [
      {
        scale: interpolate(
          pressProgress.value,
          [RELEASED, PRESSED],
          [TAB_RESTING_SCALE, TAB_PRESSED_SCALE],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // A one-frame colour flip would leave the newly selected chip white-on-light — and the
  // deselected one dark-on-dark — while the pill is still travelling. Cross-fading on the same
  // curve avoids both.
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeProgress.value,
      [INACTIVE, ACTIVE],
      [colors.text.primary, colors.text.inverse],
    ),
  }));

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => onLayout(tabKey, event),
    [onLayout, tabKey],
  );
  const handlePress = React.useCallback(() => onTabPress(tabKey), [onTabPress, tabKey]);
  const handlePressIn = React.useCallback(() => {
    pressProgress.value = withSpring(PRESSED);
  }, [pressProgress]);
  const handlePressOut = React.useCallback(() => {
    pressProgress.value = withSpring(RELEASED);
  }, [pressProgress]);

  return (
    <Touchable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      onLayout={handleLayout}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      ripple={CHIP_PRESS_FEEDBACK}
      style={styles.touchable}>
      <Reanimated.View style={[styles.tab, pressStyle]}>
        {/*
          * The chip's own glass surface fades out as it becomes active, letting the shared dark
          * pill behind the row show through. Fading the surface rather than drawing the pill on top
          * is what lets the pill travel without covering the labels of the chips it passes over —
          * the trick the reference implementation uses a clip-path for, which React Native has no
          * equivalent of. GlassView does the fading: an opacity here, on the glass's parent, would
          * break Liquid Glass.
          */}
        <GlassView shadow={false} style={StyleSheet.absoluteFill} visible={!isActive} />
        {/* The button variant: a chip is a control, and every control label is Satoshi Black. */}
        <ReanimatedAppText style={labelStyle} variant="button">
          {label}
        </ReanimatedAppText>
      </Reanimated.View>
    </Touchable>
  );
}

export function Tabs<Key extends string = string>({
  activeKey,
  edgeInset = 0,
  onTabPress,
  tabs,
}: TabsProps<Key>) {
  const { indicatorStyle, onItemLayout } = useSlidingIndicator(activeKey, tabs.map(tab => tab.key));

  return (
    <ScrollView
      accessibilityRole="tablist"
      contentContainerStyle={[styles.content, { paddingHorizontal: edgeInset }]}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, { marginHorizontal: -edgeInset }]}>
      {/*
        * Lives inside the scroll content rather than beside it, so it travels with the chips when
        * the row scrolls and needs no scroll-offset correction. Rendered first to sit underneath:
        * React Native paints siblings in document order.
        */}
      <Reanimated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
      {tabs.map(tab => (
        <TabButton
          key={tab.key}
          isActive={tab.key === activeKey}
          label={tab.label}
          onLayout={onItemLayout}
          onTabPress={onTabPress}
          tabKey={tab.key}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  indicator: {
    backgroundColor: colors.surface.dark,
    borderRadius: radii.pill,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  scroll: {
    flexGrow: 0,
  },
  // minHeight rather than height: the label scales with the OS text size, and a fixed height
  // would clip it at the larger accessibility sizes.
  tab: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: sizes.button.small,
    minWidth: sizes.button.small,
    paddingHorizontal: TAB_HORIZONTAL_PADDING,
  },
  // Clips the Android ripple to the pill instead of its bounding rectangle.
  touchable: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
});
