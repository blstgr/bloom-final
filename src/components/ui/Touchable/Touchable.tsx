import React from 'react';
import {
  Platform,
  Pressable,
  TouchableOpacity,
  type PressableAndroidRippleConfig,
  type PressableProps,
  type TouchableOpacityProps,
} from 'react-native';

import { makeThemedValue } from '../../../theme';

/** iOS press feedback: how far a pressed control fades. React Native's default (0.2) nearly
 * blanks a control; this keeps it legible while still reading as pressed. */
export const PRESSED_OPACITY = 0.78;

/**
 * - `bounded` — the ripple fills the control's own shape (buttons, chips, rows, cards).
 * - `borderless` — the ripple spreads past the control (icon-only buttons), as Material does.
 * - `none` — no press feedback on either platform: no ripple and no fade, for a control that
 *   draws its own pressed state (the iOS toggle).
 */
export type TouchableRipple = 'bounded' | 'borderless' | 'none';

/** Only the props both renderers honour. Android renders a `Pressable`, which has no
 * `delayPressIn`, `delayPressOut` or `touchSoundDisabled`; accepting them would make them work on
 * iOS and silently do nothing on Android. The narrower `TouchableOpacity` types win where the two
 * overlap (a plain `style`, not Pressable's style function), since iOS renders that one. */
type SharedTouchableProps = Pick<
  TouchableOpacityProps,
  Exclude<Extract<keyof TouchableOpacityProps, keyof PressableProps>, 'activeOpacity'>
>;

export type TouchableProps = SharedTouchableProps & {
  ripple?: TouchableRipple;
};

type RippleConfigs = Record<Exclude<TouchableRipple, 'none'>, PressableAndroidRippleConfig>;

// Built once per theme, so a Pressable receives the same config object on every render rather
// than a fresh one each time. Material's pressed state layer is the content colour at ~12%.
const useRipples = makeThemedValue<RippleConfigs>(theme => ({
  borderless: { borderless: true, color: theme.colors.ripple, foreground: true },
  bounded: { borderless: false, color: theme.colors.ripple, foreground: true },
}));

/**
 * The one pressable every Bloom control is built on, so each platform gets its own press language
 * from a single place: a fade on iOS, Material's ripple on Android.
 *
 * Callers keep one touchable type per component — this one — rather than choosing between
 * `TouchableOpacity` and `Pressable` per platform themselves.
 */
export function Touchable({ ripple = 'bounded', ...props }: TouchableProps) {
  const ripples = useRipples();

  // A control that draws its own pressed state gets none of ours on top: a fade would dim the very
  // feedback it is drawing.
  if (ripple === 'none') return <Pressable {...props} />;

  if (Platform.OS === 'android') {
    // A foreground ripple draws over the control's children, so it shows even on a control whose
    // content fills it edge to edge (a photo card, a dark pill).
    return (
      <Pressable
        {...props}
        android_ripple={ripples[ripple]}
      />
    );
  }

  return <TouchableOpacity {...props} activeOpacity={PRESSED_OPACITY} />;
}
