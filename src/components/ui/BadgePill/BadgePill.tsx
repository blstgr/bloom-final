import React from 'react';
import { StyleSheet, View } from 'react-native';

import { makeThemedStyles, radii, sizes, spacing } from '../../../theme';
import { AppText } from '../AppText';
import { Badge } from '../Badge';
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
    <View style={[styles.base, variant === 'transparent' ? styles.transparent : themedStyles[variant]]}>
      <Badge icon={icon} variant={badgeStyle} />
      {/* The filled pills sit on photos and take the badge's own colours; the transparent one sits
       * on the page, so its label follows the mode's text colour. */}
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
  default: {
    backgroundColor: theme.components.badge.light,
  },
  defaultLabel: {
    color: theme.components.badge.lightContent,
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
  // Theme-independent: the transparent pill sits on the page and has no fill of its own.
  transparent: {
    backgroundColor: 'transparent',
  },
});
