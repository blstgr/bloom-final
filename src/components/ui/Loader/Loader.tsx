import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { makeThemedStyles, radii, sizes, spacing, useTheme } from '../../../theme';

export type LoaderProps = {
  overlay?: boolean;
  size?: 'default' | 'small';
  /** What the spinner sits on: `onSurface` for the page, glass and secondary controls,
   * `onAccent` for the accent fill and photos. The overlay backing follows the same role. */
  tone?: 'onSurface' | 'onAccent';
};

export function Loader({ overlay = false, size = 'default', tone = 'onAccent' }: LoaderProps) {
  const { icon } = useTheme().colors;
  const themedStyles = useThemedStyles();
  const color = tone === 'onSurface' ? icon.primary : icon.onAccent;
  const boxSize = size === 'small' ? spacing.xxl : sizes.button.default;
  const spinnerSize = size === 'small' ? 'small' : 'large';

  return (
    <View
      style={[
        styles.container,
        { height: boxSize, width: boxSize },
        overlay && styles.overlay,
        overlay && (tone === 'onSurface' ? themedStyles.overlayOnSurface : themedStyles.overlayOnAccent),
      ]}>
      <ActivityIndicator color={color} size={spinnerSize} />
    </View>
  );
}

const useThemedStyles = makeThemedStyles(theme => ({
  overlayOnAccent: {
    backgroundColor: theme.components.loader.dim,
  },
  overlayOnSurface: {
    backgroundColor: theme.components.loader.frost,
  },
}));

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    borderRadius: radii.pill,
  },
});
