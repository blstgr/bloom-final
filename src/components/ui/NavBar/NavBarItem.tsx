import React from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { colors, radii, sizes } from '../../../theme';
import { Icon, type IconName } from '../Icon';
import { Touchable } from '../Touchable';

const HALF = 2;

export type NavBarItemProps = {
  accessibilityLabel?: string;
  active?: boolean;
  icon: IconName;
  /** Live width of the shared pill, from `useSlidingIndicator`. */
  indicatorWidth: SharedValue<number>;
  /** Live x of the shared pill, in the same coordinate space as `itemX`. */
  indicatorX: SharedValue<number>;
  /** This item's measured width, or 0 before it has been laid out. */
  itemWidth: number;
  /** This item's measured x within the bar, or 0 before it has been laid out. */
  itemX: number;
  onPress?: () => void;
};

export function NavBarItem({
  accessibilityLabel,
  active = false,
  icon,
  indicatorWidth,
  indicatorX,
  itemWidth,
  itemX,
  onPress,
}: NavBarItemProps) {
  /*
   * Which icon shows is decided by how far the pill is from this item, not by this item's own
   * `active` flag.
   *
   * The pill is `colors.action.primary` and a resting icon is `colors.icon.primary` — the same
   * value. An item the pill merely travels *past* never changes `active`, so a flag-driven
   * cross-fade never runs for it and its icon sits dark-on-dark until the pill has gone by. Brief
   * enough to miss at full frame rate, plainly visible once frames drop.
   *
   * Measuring the overlap instead makes every item invert exactly while the pill covers it, which
   * is what the web reference achieves with a clip-path — not an option in React Native for text
   * or SVG without giving up real font rendering.
   *
   * Before this item has been measured there is no overlap to compute, so it falls back to its
   * own flag for that first frame.
   */
  const coverage = useDerivedValue(() => {
    if (itemWidth === 0) return active ? 1 : 0;

    const itemCentre = itemX + itemWidth / HALF;
    const indicatorCentre = indicatorX.value + indicatorWidth.value / HALF;

    return interpolate(
      Math.abs(indicatorCentre - itemCentre),
      [0, itemWidth / HALF],
      [1, 0],
      Extrapolation.CLAMP,
    );
  });

  const activeIconStyle = useAnimatedStyle(() => ({ opacity: coverage.value }));
  const restingIconStyle = useAnimatedStyle(() => ({ opacity: 1 - coverage.value }));

  return (
    <Touchable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      ripple="borderless"
      style={styles.item}>
      {/*
        * Two stacked copies of the icon cross-faded by opacity, rather than one icon swapping its
        * colour prop: the colour lives on an SVG fill, which cannot be interpolated without
        * animating SVG props, whereas opacity on a wrapping view can.
        */}
      <Reanimated.View pointerEvents="none" style={[styles.iconLayer, restingIconStyle]}>
        <Icon name={icon} color={colors.icon.primary} size={sizes.icon.md} />
      </Reanimated.View>
      <Reanimated.View pointerEvents="none" style={[styles.iconLayer, activeIconStyle]}>
        <Icon name={icon} color={colors.icon.inverse} size={sizes.icon.md} />
      </Reanimated.View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  iconLayer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  item: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: sizes.nav.item,
    justifyContent: 'center',
    width: sizes.nav.item,
  },
});
