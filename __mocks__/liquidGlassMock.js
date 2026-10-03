// @callstack/liquid-glass reads a native module at import time on iOS, which Jest does not have.
// A plain View stands in for the glass, and support is reported as off so tests exercise the
// fallback surface — the one every Android device and older iPhone renders.
const { View } = require('react-native');

module.exports = {
  LiquidGlassContainerView: View,
  LiquidGlassView: View,
  isLiquidGlassSupported: false,
};
