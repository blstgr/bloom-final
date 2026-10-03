import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { makeThemedStyles, radii, sizes, useTheme } from '../../../theme';
import { AppText } from '../AppText';
import { GlassView } from '../GlassView';
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
  const theme = useTheme();
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
          !inverted && themedStyles.count,
          size === 'small' && styles.small,
          style,
        ]}>
        {inverted ? <GlassView style={StyleSheet.absoluteFill} /> : null}
        <AppText
          style={inverted ? themedStyles.glassLabel : themedStyles.countLabel}
          variant="bodyS">
          {countLabel}
        </AppText>
      </View>
    );
  }

  // icon / default / inverted — circular icon badge
  const inverted = variant === 'inverted';

  return (
    <View style={[styles.icon, inverted && themedStyles.iconInverted, style]}>
      {inverted ? null : <GlassView style={StyleSheet.absoluteFill} />}
      <Icon
        name={icon ?? 'water'}
        size={sizes.icon.sm}
        color={inverted ? theme.components.badge.darkContent : theme.colors.icon.primary}
      />
    </View>
  );
}

// The light badge is the glass of an inactive chip (Figma 530:2728), so it and its content follow
// the mode like every glass surface. The count and the dark badge keep their own colours
// (components.badge): the dark one is the accent, like the primary button (530:2722).
const useThemedStyles = makeThemedStyles(theme => ({
  count: {
    backgroundColor: theme.components.badge.count,
  },
  countLabel: {
    color: theme.components.badge.countLabel,
  },
  glassLabel: {
    color: theme.colors.text.primary,
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
