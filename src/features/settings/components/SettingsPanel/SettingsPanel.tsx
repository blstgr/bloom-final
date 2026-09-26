import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../../../components/ui/Button';
import { colors, radii, shadows, sizes, spacing } from '../../../../theme';

import { SettingsRow, type SettingsRowProps } from './SettingsRow';

export type SettingsPanelProps = {
  rows: SettingsRowProps[];
  onLogoutPress?: () => void;
};

export function SettingsPanel({ onLogoutPress, rows }: SettingsPanelProps) {
  const rowKeyCounts = new Map<string, number>();

  return (
    // Outer view holds the border and shadow — no overflow:hidden so the border isn't clipped.
    // Inner view clips row content to the rounded corners.
    <View style={styles.border}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  border: {
    ...shadows.soft,
    backgroundColor: colors.surface.glass,
    borderColor: colors.border.glass,
    borderRadius: radii.xxl,
    borderWidth: sizes.border.thin,
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
