import React from 'react';
import { StyleSheet, View } from 'react-native';

import { makeThemedStyles, radii, sizes, spacing } from '../../../theme';
import { AppText } from '../AppText';
import { Badge } from '../Badge';
import { GlassView } from '../GlassView';
import { type IconName } from '../Icon';

export type BadgePillVariant = 'transparent' | 'inverted' | 'default';
export type BadgePillBadgeVariant = 'light' | 'dark';

type BadgePillContent =
  | { label: string; day?: never; month?: never }
  | { day: string; month: string; label?: never };

type BadgePillVariantProps =
  | { variant: 'transparent'; badgeVariant?: BadgePillBadgeVariant }
  | { variant: 'inverted' | 'default'; badgeVariant?: never };

export type BadgePillProps = { icon?: IconName } & BadgePillContent & BadgePillVariantProps;

export function BadgePill({ badgeVariant, day, icon = 'water', label, month, variant }: BadgePillProps) {
  const themedStyles = useThemedStyles();
  const effectiveBadgeVariant =
    variant === 'inverted' ? 'light'
    : variant === 'default' ? 'dark'
    : (badgeVariant ?? 'dark');
  const badgeStyle = effectiveBadgeVariant === 'light' ? 'default' : 'inverted';

  const parts = label?.trim().split(' ') ?? [];
  const line1 = day ?? parts[0] ?? '';
  const line2 = month ?? parts.slice(1).join(' ');

  return (
    <View style={[styles.base, variant === 'inverted' ? themedStyles.inverted : styles.transparent]}>
      {variant === 'default' ? <GlassView style={StyleSheet.absoluteFill} /> : null}
      <Badge icon={icon} variant={badgeStyle} />
      {/* The dark pill takes the badge's own colours; the light one is glass and the transparent one
       * sits on the page, so their labels follow the mode's text colour. */}
      <AppText
        style={[
          styles.label,
          variant === 'inverted' && themedStyles.invertedLabel,
          variant === 'default' && themedStyles.defaultLabel,
        ]}
        variant="bodyS">
        {line2 ? `${line1}\n${line2}` : line1}
      </AppText>
    </View>
  );
}

const useThemedStyles = makeThemedStyles(theme => ({
  defaultLabel: {
    color: theme.colors.text.primary,
  },
  inverted: {
    backgroundColor: theme.components.badge.dark,
  },
  invertedLabel: {
    color: theme.components.badge.darkContent,
  },
}));

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    gap: spacing.xs,
    padding: spacing.xs,
    width: sizes.badge.pill,
  },
  label: {
    textAlign: 'center',
  },
  // Theme-independent: the transparent pill has no fill of its own, and the light pill's comes from
  // the GlassView behind its content.
  transparent: {
    backgroundColor: 'transparent',
  },
});
