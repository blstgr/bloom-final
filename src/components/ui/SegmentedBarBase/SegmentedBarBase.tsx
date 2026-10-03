import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing } from '../../../theme';
import { GlassView } from '../GlassView';

export type SegmentedBarBaseProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** The bar's inner padding (Figma `506:4520`): items sit 4 in from the rim on every side. Exported
 * because an absolutely positioned child — NavBar's sliding pill — is laid out from the padding
 * box's edge, not the padded content, and has to add it back itself. */
export const SEGMENTED_BAR_PADDING = spacing.xxs;

export function SegmentedBarBase({ children, style }: SegmentedBarBaseProps) {
  return (
    <GlassView radius={radii.pill} style={[styles.outer, style]}>
      <View style={styles.row}>{children}</View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: 'center',
  },
  // GlassView's surface is its own View and doesn't inherit flexDirection from the outer
  // style, so the row layout lives here instead.
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: SEGMENTED_BAR_PADDING,
  },
});
