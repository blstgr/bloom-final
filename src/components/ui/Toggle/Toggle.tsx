import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, durations, opacities, radii, springs } from '../../../theme';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 28;
// The thumb is centred in the track, so the same inset appears on both sides.
const BOTH_SIDES = 2;
const THUMB_INSET = (TRACK_HEIGHT - THUMB_SIZE) / BOTH_SIDES;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * BOTH_SIDES;
const THUMB_RADIUS = THUMB_SIZE / BOTH_SIDES;
const PRESSED_SCALE = 0.9;
const RESTING_SCALE = 1;
// A rejected tap: a couple of points either way, decaying to rest. Short enough to read as "no"
// rather than as an animation the control is playing at you.
const REJECT_SHAKE_AMPLITUDE = 2;
const REJECT_SHAKE_OFFSETS = [
  -REJECT_SHAKE_AMPLITUDE,
  REJECT_SHAKE_AMPLITUDE,
  -REJECT_SHAKE_AMPLITUDE / BOTH_SIDES,
  0,
];
const REJECT_SHAKE_STEP_MS = 40;

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
 * because `docs/code-review.md` allows only one animation API per component.
 *
 * The thumb travels on a spring so the throw has weight, while the track's colour runs on a
 * timing curve — springs cannot drive an interpolated colour, so the two are matched by eye to
 * settle together. A press squashes the thumb; a press on a disabled switch shakes it instead,
 * so a tap that does nothing is visibly refused rather than silently swallowed.
 */
export function Toggle({ accessibilityLabel, disabled = false, onValueChange, value }: ToggleProps) {
  const reduceMotion = useReducedMotion();
  const pressScale = useSharedValue(RESTING_SCALE);
  const rejectOffset = useSharedValue(0);

  const progress = useDerivedValue(() =>
    reduceMotion ? (value ? 1 : 0) : withSpring(value ? 1 : 0, springs.toggleThumb),
  );

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.brand.dark, colors.brand.green],
    ),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * THUMB_TRAVEL + rejectOffset.value },
      { scale: pressScale.value },
    ],
  }));

  const handlePressIn = () => {
    if (reduceMotion) return;
    if (disabled) {
      rejectOffset.value = withSequence(
        ...REJECT_SHAKE_OFFSETS.map(offset =>
          withTiming(offset, { duration: REJECT_SHAKE_STEP_MS }),
        ),
      );

      return;
    }
    pressScale.value = withTiming(PRESSED_SCALE, { duration: durations.indicatorCrossFadeMs });
  };

  const handlePressOut = () => {
    if (reduceMotion) return;
    pressScale.value = withTiming(RESTING_SCALE, { duration: durations.indicatorCrossFadeMs });
  };

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      // Deliberately still pressable when disabled: onPress is inert, but the press-in handler
      // plays the rejection shake, which is the whole point of showing one.
      onPress={disabled ? undefined : () => onValueChange(!value)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={disabled ? styles.disabled : undefined}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: opacities.disabled,
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
