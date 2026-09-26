const React = require('react');
const ReactNative = require('react-native');

// Shared by interpolate() and interpolateColor(): finds the range `value` falls in, or reports
// that it sits outside the range entirely so the caller can clamp to an endpoint.
function locate(value, inputRange) {
  const lastIndex = inputRange.length - 1;
  if (value <= inputRange[0]) return { atEnd: 0 };
  if (value >= inputRange[lastIndex]) return { atEnd: lastIndex };

  const upperIndex = inputRange.findIndex(point => value <= point);
  const lowerIndex = Math.max(0, upperIndex - 1);
  const inputDelta = inputRange[upperIndex] - inputRange[lowerIndex];
  const progress = inputDelta === 0 ? 0 : (value - inputRange[lowerIndex]) / inputDelta;

  return { lowerIndex, progress, upperIndex };
}

function interpolate(value, inputRange, outputRange) {
  const at = locate(value, inputRange);
  if (at.atEnd !== undefined) return outputRange[at.atEnd];

  return outputRange[at.lowerIndex]
    + (outputRange[at.upperIndex] - outputRange[at.lowerIndex]) * at.progress;
}

const Reanimated = {
  ...ReactNative.Animated,
  Extrapolation: {
    CLAMP: 'clamp',
    EXTEND: 'extend',
    IDENTITY: 'identity',
  },
  Image: ReactNative.Image,
  ScrollView: ReactNative.ScrollView,
  Text: ReactNative.Text,
  View: ReactNative.View,
  createAnimatedComponent: component => component,
  interpolate,
  // Colors can't be linearly blended the way interpolate() blends numbers, and tests only ever
  // assert the endpoints — snap to whichever end of the range `value` is nearer.
  interpolateColor: (value, inputRange, outputRange) => {
    const at = locate(value, inputRange);
    if (at.atEnd !== undefined) return outputRange[at.atEnd];

    // Colors can't be blended the way interpolate() blends numbers, and tests only ever assert
    // the endpoints — snap to whichever end of the range `value` is nearer.
    return at.progress < 0.5 ? outputRange[at.lowerIndex] : outputRange[at.upperIndex];
  },
  measure: () => null,
  runOnJS: callback => callback,
  scrollTo: () => undefined,
  useAnimatedGestureHandler: handlers => handlers,
  // Tests run with the keyboard closed, which is the resting layout every assertion is
  // written against; the open state is a device-only concern.
  useAnimatedKeyboard: () => ({ height: { value: 0 }, state: { value: 0 } }),
  useAnimatedProps: updater => updater(),
  useAnimatedReaction: () => undefined,
  useAnimatedRef: () => React.createRef(),
  useAnimatedScrollHandler: handler => handler,
  useAnimatedStyle: updater => updater(),
  // Tests run as if the OS reduce-motion setting is off, which is the path the components
  // actually animate down; the reduced path just assigns values directly.
  useReducedMotion: () => false,
  useDerivedValue: updater => ({ value: updater() }),
  useEvent: () => undefined,
  useHandler: () => ({ context: {}, doDependenciesDiffer: false, useWeb: false }),
  useSharedValue: value => ({ value }),
  withDelay: (_delay, value) => value,
  withSpring: value => value,
  withTiming: (value, _config, callback) => {
    callback?.(true);
    return value;
  },
};

module.exports = Reanimated;
module.exports.default = Reanimated;
