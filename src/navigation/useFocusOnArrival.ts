import React from 'react';
import type { TextInput } from 'react-native';

type TransitionAwareNavigation = {
  addListener: (
    event: 'transitionEnd',
    callback: (event: { data: { closing: boolean } }) => void,
  ) => () => void;
};

/**
 * A ref to put on a screen's search field, focused once the screen has finished transitioning in.
 *
 * `autoFocus` fires on mount, while the screen is still fading in; on Android the field takes focus
 * but the keyboard does not rise, leaving a caret and no way to type until the user taps. Focusing
 * after `transitionEnd` raises it on both platforms.
 */
export function useFocusOnArrival(navigation: TransitionAwareNavigation) {
  const inputRef = React.useRef<TextInput>(null);

  React.useEffect(
    () =>
      navigation.addListener('transitionEnd', event => {
        if (!event.data.closing) inputRef.current?.focus();
      }),
    [navigation],
  );

  return inputRef;
}
