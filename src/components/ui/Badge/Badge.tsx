import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { makeThemedStyles, radii, sizes, useTheme } from '../../../theme';
import { AppText } from '../AppText';
import { Icon, type IconName } from '../Icon';

export type BadgeVariant = 'default' | 'inverted' | 'alert' | 'count' | 'icon';
export type BadgeSize = 'normal' | 'small';

type BadgeBaseProps = {
  style?: ViewStyle;
};

type BadgeIconProps = BadgeBaseProps & {
  count?: never;
  icon?: IconName;
  label?: never;
  size?: never;
  variant?: 'default' | 'inverted' | 'icon';
};

type BadgeCountProps = BadgeBaseProps & {
  count?: number;
  icon?: never;
  label?: string;
  size?: BadgeSize;
  variant?: 'default' | 'inverted' | 'count';
};

type BadgeAlertProps = BadgeBaseProps & {
  count?: number;
  icon?: never;
  label?: string;
  size?: 'small';
  variant: 'alert';
};

export type BadgeProps = BadgeIconProps | BadgeCountProps | BadgeAlertProps;

export function Badge({
  count,
  icon,
  label,
  size = 'normal',
  style,
  variant = 'default',
}: BadgeProps) {
  const { badge } = useTheme().components;
  const themedStyles = useThemedStyles();
  const countLabel = label ?? (typeof count === 'number' ? `${count}` : undefined);

  if (variant === 'alert') {
    return (
      <View style={[styles.count, themedStyles.count, size === 'small' && styles.small, style]}>
        <AppText style={themedStyles.countLabel} variant="bodyS">
          {countLabel ?? '!'}
        </AppText>
      </View>
    );
  }

  if (countLabel) {
    const inverted = variant === 'inverted';
    return (
      <View
        style={[
          styles.count,
          themedStyles.count,
          inverted && themedStyles.countInverted,
          size === 'small' && styles.small,
          style,
        ]}>
        <AppText
          style={inverted ? themedStyles.countInvertedLabel : themedStyles.countLabel}
          variant="bodyS">
          {countLabel}
        </AppText>
      </View>
    );
  }

  // icon / default / inverted — circular icon badge
  const inverted = variant === 'inverted';

  return (
    <View
      style={[
        styles.icon,
        themedStyles.icon,
        inverted && themedStyles.iconInverted,
        style,
      ]}>
      <Icon
        name={icon ?? 'water'}
        size={sizes.icon.sm}
        color={inverted ? badge.darkContent : badge.lightContent}
      />
    </View>
  );
}

// Badges sit on photos, so they keep their own colours in both modes (components.badge) rather
// than following the text and surface roles, which flip with the mode.
const useThemedStyles = makeThemedStyles(theme => ({
  count: {
    backgroundColor: theme.components.badge.count,
  },
  countInverted: {
    backgroundColor: theme.components.badge.light,
  },
  countInvertedLabel: {
    color: theme.components.badge.lightContent,
  },
  countLabel: {
    color: theme.components.badge.countLabel,
  },
  icon: {
    backgroundColor: theme.components.badge.light,
  },
  iconInverted: {
    backgroundColor: theme.components.badge.dark,
  },
}));

const styles = StyleSheet.create({
  count: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: sizes.nav.badge,
    justifyContent: 'center',
    width: sizes.nav.badge,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: sizes.badge.md,
    justifyContent: 'center',
    width: sizes.badge.md,
  },
  small: {
    height: sizes.nav.badge,
    width: sizes.nav.badge,
  },
});
