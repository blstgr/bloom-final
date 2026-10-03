import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../../theme';
import { AppText } from '../AppText';
import { Icon, type IconName } from '../Icon';

// Tighter than the body default so a two-line subtitle reads as one block under the title.
const SUBTITLE_LINE_HEIGHT = 20;

export type EmptyStateProps = {
  icon: IconName;
  subtitle: string;
  title: string;
};

/**
 * The icon + title + subtitle block every tab screen shows when it has nothing to list.
 *
 * It fills its parent and centres itself, so screens that give it the same content box land it
 * on the same pixel. That is what lets the tab navigator's cross-fade dissolve one empty state
 * into the next instead of fading and jumping at the same time.
 */
export function EmptyState({ icon, subtitle, title }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <Icon color={colors.icon.green} name={icon} size="xxl" />
      <AppText align="center" variant="titleXl">
        {title}
      </AppText>
      <AppText align="center" style={styles.subtitle}>
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flexGrow: 1,
    gap: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    lineHeight: SUBTITLE_LINE_HEIGHT,
  },
});
