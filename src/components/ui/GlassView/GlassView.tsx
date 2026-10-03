import { isLiquidGlassSupported, LiquidGlassView } from '@callstack/liquid-glass';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, durations, radii, shadows } from '../../../theme';

import { GlassRim } from './GlassRim';

const SHOWN = 1;
const HIDDEN = 0;

type GlassViewBaseProps = {
  /** The Figma glass edge, a white gradient line (`GlassRim`). */
  border?: boolean;
  children?: React.ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * `visible` fades the surface in and out (a chip handing over to the travelling active pill).
 * It requires `shadow={false}`: Liquid Glass breaks under an alpha below 1 on itself or any
 * superview, so there the glass dematerialises natively instead of fading — and the drop shadow,
 * which sits on the glass's superview, would have no way to follow it.
 */
export type GlassViewProps = GlassViewBaseProps &
  ({ shadow?: boolean; visible?: never } | { shadow: false; visible: boolean });

/**
 * Bloom's floating surface, and the one place the platforms are allowed to look different.
 *
 * - iOS 26+: Apple's Liquid Glass (light) under the Figma fill (white 50%). Figma's own Glass effect
 *   (refraction, depth, dispersion, frost) is not exported to code and no native API takes those
 *   numbers, so the native material is the match, not a recreation of the parameters.
 * - Older iOS: the Figma fill flat, without the glass.
 * - Android: an opaque surface in the colour the glass renders as, with the same soft shadow and
 *   gradient rim. Android has no translucent surfaces, so it does not imitate glass it lacks.
 */
export function GlassView({
  border = true,
  children,
  radius = radii.pill,
  shadow = true,
  style,
  visible = true,
}: GlassViewProps) {
  const shown = useSharedValue(visible ? SHOWN : HIDDEN);
  React.useEffect(() => {
    shown.value = withTiming(visible ? SHOWN : HIDDEN, { duration: durations.indicatorCrossFadeMs });
  }, [shown, visible]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: shown.value }));

  // A caller with no children (a Tabs chip, WateringSlider's track) sizes this purely from
  // `style`, e.g. absoluteFill; without content the inner surface would collapse to zero height.
  // Gated on that rather than applied always: flexGrow on a real-content case can balloon
  // auto-sized ancestors when a sibling elsewhere is flex:1.
  const hasContent = children != null;
  const shape = { borderRadius: radius };

  if (isLiquidGlassSupported) {
    // Three layers in a clipping pill: the glass, then the Figma fill over it, then the content.
    // The fill is a sibling over the glass rather than content inside it, because iOS adapts
    // whatever sits inside a glass view to the backdrop — the same button read clear on one screen
    // and solid white on the next. Over it, the fill paints identically everywhere. `colorScheme`
    // is pinned to light for the same reason: the material may not flip with what scrolls behind.
    //
    // Nothing here carries an alpha below 1 on the glass or its superviews (see `visible`): the
    // glass fades by its effect going to `none`, which UIKit animates; the fill and the rim are
    // siblings and fade beside it.
    return (
      <View style={[shape, shadow && shadows.soft, style]}>
        <View style={[styles.clip, shape, !hasContent && styles.fill]}>
          <LiquidGlassView
            animationDuration={durations.indicatorCrossFadeMs}
            colorScheme="light"
            effect={visible ? 'regular' : 'none'}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          <Reanimated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.flatGlass, fadeStyle]}
          />
          {children}
        </View>
        {border ? (
          <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fadeStyle]}>
            <GlassRim radius={radius} />
          </Reanimated.View>
        ) : null}
      </View>
    );
  }

  return (
    // The shadow sits on a plain unclipped View: the surface itself clips to the pill, and a
    // shadow on a clipping view is clipped with it.
    <Reanimated.View style={[shape, shadow && shadows.soft, style, fadeStyle]}>
      <View style={[styles.clip, shape, !hasContent && styles.fill, styles.flatSurface]}>
        {children}
      </View>
      {border ? <GlassRim radius={radius} /> : null}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  fill: {
    flexGrow: 1,
  },
  flatGlass: {
    backgroundColor: colors.surface.glass,
  },
  // Without glass beneath it, iOS < 26 shows the Figma fill as is. Android has no translucent
  // surfaces, so it paints the colour that fill actually renders as over the app gradient.
  flatSurface: {
    backgroundColor: Platform.select({
      android: colors.surface.container,
      default: colors.surface.glass,
    }),
  },
});
