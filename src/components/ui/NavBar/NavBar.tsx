import React from 'react';
import { StyleSheet, View, type LayoutRectangle, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { colors, radii, sizes, spacing } from '../../../theme';
import { Badge } from '../Badge';
import { type IconName } from '../Icon';
import { SEGMENTED_BAR_PADDING, SegmentedBarBase } from '../SegmentedBarBase';
import { useSlidingIndicator } from '../SlidingIndicator';

import { NavBarItem } from './NavBarItem';

export type NavItem<Key extends string = string> = {
  accessibilityLabel?: string;
  badgeCount?: number;
  icon: IconName;
  key: Key;
  onPress?: () => void;
};

export type NavBarProps<Key extends string = string> = {
  activeKey?: Key;
  items: NavItem<Key>[];
  style?: StyleProp<ViewStyle>;
};

export function NavBar<Key extends string = string>({ activeKey, items, style }: NavBarProps<Key>) {
  // One store of item geometry, in state rather than a ref, because two things now render from
  // it: the badge overlay and each item's pill-overlap calculation. It was previously a ref plus
  // a `forceUpdate()` fired from onLayout, which re-entered layout and looped (an Android ANR)
  // until it was guarded. Updating state only when a rect actually changes removes both the
  // duplicate store and the loop.
  const [itemLayouts, setItemLayouts] = React.useState<Record<string, LayoutRectangle>>({});
  const { indicatorStyle, indicatorWidth, indicatorX, onItemLayout } = useSlidingIndicator(activeKey, items.map(item => item.key));

  const handleItemLayout = React.useCallback(
    (key: string, layout: LayoutRectangle) => {
      setItemLayouts(current => {
        const previous = current[key];
        if (previous?.x === layout.x && previous.width === layout.width) return current;

        return { ...current, [key]: layout };
      });
    },
    [],
  );

  return (
    <View style={[styles.wrap, style]}>
      <SegmentedBarBase>
        {/*
          * One pill for the whole bar, gliding to whichever item is active, instead of each item
          * carrying its own background. Rendered before the items so it paints underneath — React
          * Native draws siblings in document order. Items are a fixed square, so only its x moves.
          */}
        <Reanimated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
        {items.map(item => (
          <View
            key={item.key}
            onLayout={e => {
              onItemLayout(item.key, e);
              handleItemLayout(item.key, e.nativeEvent.layout);
            }}>
            <NavBarItem
              accessibilityLabel={item.accessibilityLabel ?? item.key}
              active={item.key === activeKey}
              icon={item.icon}
              indicatorWidth={indicatorWidth}
              indicatorX={indicatorX}
              itemWidth={itemLayouts[item.key]?.width ?? 0}
              itemX={itemLayouts[item.key]?.x ?? 0}
              onPress={item.onPress}
            />
          </View>
        ))}
      </SegmentedBarBase>
      {/*
       * Badges are rendered in a separate overlay layer so the segmented container
       * can keep overflow clipping for rounded corners without clipping badge bubbles.
       * Positions are measured via onLayout on each item wrapper rather than computed
       * from a fixed item width, so badge placement stays accurate if item sizes vary.
       */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {items.map(item => {
          if (!item.badgeCount) return null;
          const layout = itemLayouts[item.key];
          if (!layout) return null;
          return (
            <Badge
              key={`${item.key}-badge`}
              variant="count"
              label={`${item.badgeCount}`}
              style={{ ...styles.badge, left: layout.x + layout.width - sizes.nav.badge + spacing.xxs }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -sizes.nav.badgeOffset,
  },
  indicator: {
    backgroundColor: colors.action.primary,
    borderRadius: radii.pill,
    height: sizes.nav.item,
    left: 0,
    position: 'absolute',
    // The pill's x comes from each item's measured layout, which already includes the bar's
    // padding; its top does not, so it is added here.
    top: SEGMENTED_BAR_PADDING,
  },
  wrap: {
    alignSelf: 'center',
  },
});
