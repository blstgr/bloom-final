import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii } from '../../../theme';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 28;
// The thumb is centred in the track, so the same inset appears on both sides.
const BOTH_SIDES = 2;
const THUMB_INSET = (TRACK_HEIGHT - THUMB_SIZE) / BOTH_SIDES;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * BOTH_SIDES;
const THUMB_RADIUS = THUMB_SIZE / BOTH_SIDES;
const TRANSITION_MS = 180;
// Matches the dimming the rest of the design system uses for an inert control.
const DISABLED_OPACITY = 0.4;

export type ToggleProps = {
  /** Required: a toggle is icon-only by construction — its row label is a sibling, not a child,
   * so nothing inside it can serve as its accessible name. */
  accessibilityLabel: string;
  disabled?: boolean;
  onValueChange: (next: boolean) => void;
  value: boolean;
};

/**
 * An on/off switch in Bloom's own design language.
 *
 * React Native's built-in `Switch` renders the platform control, which sits wrong next to the
 * cream-and-glass surfaces every other control here uses. Reanimated rather than `Animated`
 * because `docs/code-review.md` allows only one animation API per component and the rest of this
 * codebase has standardised on Reanimated.
 */
export function Toggle({ accessibilityLabel, disabled = false, onValueChange, value }: ToggleProps) {
  const progress = useDerivedValue(() => withTiming(value ? 1 : 0, { duration: TRANSITION_MS }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.brand.dark, colors.brand.green],
    ),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={disabled ? styles.disabled : undefined}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  thumb: {
    backgroundColor: colors.surface.white,
    borderRadius: THUMB_RADIUS,
    height: THUMB_SIZE,
    width: THUMB_SIZE,
  },
  track: {
    borderRadius: radii.pill,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: THUMB_INSET,
    width: TRACK_WIDTH,
  },
});
