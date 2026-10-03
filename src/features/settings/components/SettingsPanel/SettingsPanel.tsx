import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../../../components/ui/Button';
import { GlassView } from '../../../../components/ui/GlassView';
import { colors, radii, sizes, spacing } from '../../../../theme';

import { SettingsRow, type SettingsRowProps } from './SettingsRow';

export type SettingsPanelProps = {
  rows: SettingsRowProps[];
  onLogoutPress?: () => void;
};

export function SettingsPanel({ onLogoutPress, rows }: SettingsPanelProps) {
  const rowKeyCounts = new Map<string, number>();

  return (
    // The panel is the shared floating surface: glass on iOS, an opaque Material surface on
    // Android. The inner view clips row content to the rounded corners.
    <GlassView radius={radii.xxl} style={styles.panel}>
      <View style={styles.inner}>
        {rows.map(row => {
          // Only `variant` is common to every row shape, so the rest of the key is read
          // defensively rather than by reaching into props a given variant may not have.
          const rowLabel =
            'label' in row ? row.label : undefined;
          const rowKeyBase = `${row.variant}-${rowLabel ?? 'row'}`;
          const rowKeyCount = rowKeyCounts.get(rowKeyBase) ?? 0;
          rowKeyCounts.set(rowKeyBase, rowKeyCount + 1);

          return <SettingsRow key={`${rowKeyBase}-${rowKeyCount}`} {...row} />;
        })}
        {onLogoutPress ? (
          <View style={styles.logout}>
            <Button label="Log out" onPress={onLogoutPress} />
          </View>
        ) : null}
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
  },
  inner: {
    backgroundColor: 'transparent',
    borderRadius: radii.xxl - sizes.border.thin,
    gap: spacing.xxs,
    overflow: 'hidden',
  },
  logout: {
    backgroundColor: colors.surface.white,
    padding: spacing.xxl,
  },
});
