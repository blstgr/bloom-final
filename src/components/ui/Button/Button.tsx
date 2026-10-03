import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeThemedStyles, radii, shadows, sizes, spacing, useTheme } from '../../../theme';
import { AppText } from '../AppText';
import { GlassView } from '../GlassView';
import { Icon, type IconName } from '../Icon';
import { Loader } from '../Loader';
import { Touchable, type TouchableProps } from '../Touchable';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'small' | 'normal';
export type ButtonLayout = 'hug' | 'fill';

type ButtonBaseProps = Omit<TouchableProps, 'ripple'> & {
  iconSize?: number;
  loading?: boolean;
  layout?: ButtonLayout;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
};

type ButtonIconOnlyProps = ButtonBaseProps & {
  accessibilityLabel: string;
  icon: IconName;
  iconOnly?: true;
  label?: never;
};

type ButtonTextProps = ButtonBaseProps & {
  accessibilityLabel?: string;
  icon?: IconName;
  iconOnly?: false;
  label: string;
};

export type ButtonProps = ButtonIconOnlyProps | ButtonTextProps;

const DISABLED_CONTENT_OPACITY = 0.48;

export function Button({
  disabled,
  icon,
  iconOnly = false,
  iconSize,
  layout = 'hug',
  label,
  loading = false,
  size = 'normal',
  style,
  variant = 'primary',
  ...pressableProps
}: ButtonProps) {
  const theme = useTheme();
  const themedStyles = useThemedStyles();
  const [buttonLayout, setButtonLayout] = React.useState<{ width: number; height: number } | null>(null);
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  const foreground = isPrimary ? theme.colors.icon.onAccent : theme.colors.icon.primary;
  const hasLabel = Boolean(label);
  const isIconOnly = iconOnly || (!hasLabel && Boolean(icon));
  const loaderTone = isPrimary ? 'onAccent' : 'onSurface';
  const resolvedIconSize = iconSize ?? (isIconOnly ? sizes.icon.md : size === 'small' ? sizes.icon.sm : sizes.icon.md);
  const keepHugWidth = layout === 'hug' && hasLabel && loading && buttonLayout != null;

  const touchableStyle = [
    styles.base,
    styles[size],
    isIconOnly && styles.compact,
    layout === 'fill' && styles.fill,
    isIconOnly && styles.iconOnly,
    isIconOnly && size === 'small' && styles.iconOnlySmall,
    keepHugWidth && { width: buttonLayout.width },
  ];

  const content = (
    <View style={[styles.content, isDisabled && styles.contentDisabled]}>
      {loading ? (
        <Loader size="small" tone={loaderTone} />
      ) : (
        <>
          {icon ? <Icon name={icon} color={foreground} size={resolvedIconSize} /> : null}
          {hasLabel ? (
            <AppText style={isPrimary ? themedStyles.labelOnAccent : themedStyles.label} variant="button">
              {label}
            </AppText>
          ) : null}
        </>
      )}
    </View>
  );

  const outerStyle = [styles.outer, layout === 'fill' && styles.shadowWrapperFill, style];

  if (isPrimary) {
    const touchable = (
      <Touchable
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: isDisabled }}
        disabled={isDisabled}
        ripple={isIconOnly ? 'borderless' : 'bounded'}
        style={[...touchableStyle, themedStyles.primary]}
        onLayout={event => setButtonLayout(event.nativeEvent.layout)}
        {...pressableProps}>
        {content}
      </Touchable>
    );

    // The accent fill alone, with no edge in either mode (docs/dark-mode-spec.md §1). Android is a
    // flat Material filled button with no elevation (docs/search-spec.md §5); iOS adds the soft
    // shadow. The pill clips the ripple to its own shape.
    return (
      // Shadow lives on this outer wrapper, never on the same View doing the pill-shape
      // clipping (overflow: 'hidden' always clips a shadow rendered on that same layer).
      <View style={[outerStyle, Platform.OS !== 'android' && styles.primaryShadow]}>
        <View style={styles.shadowWrapper}>{touchable}</View>
      </View>
    );
  }

  // The glass draws its own depth and rim, so the platform split stays inside GlassView
  // (docs/search-spec.md §4.3).
  return (
    <View style={outerStyle}>
      <GlassView>
        <Touchable
          accessibilityRole="button"
          accessibilityState={{ busy: loading, disabled: isDisabled }}
          disabled={isDisabled}
          ripple={isIconOnly ? 'borderless' : 'bounded'}
          style={touchableStyle}
          onLayout={event => setButtonLayout(event.nativeEvent.layout)}
          {...pressableProps}>
          {content}
        </Touchable>
      </GlassView>
    </View>
  );
}

const useThemedStyles = makeThemedStyles(theme => ({
  // The label colour is set here rather than through an AppText tone, so it is the same token the
  // icon beside it uses.
  label: {
    color: theme.colors.text.primary,
  },
  labelOnAccent: {
    color: theme.colors.text.onAccent,
  },
  primary: {
    backgroundColor: theme.colors.accent,
  },
}));

const styles = StyleSheet.create({
  outer: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
  },
  primaryShadow: {
    ...shadows.soft,
  },
  shadowWrapper: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    position: 'relative',
  },
  shadowWrapperFill: {
    width: '100%',
  },
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  contentDisabled: {
    opacity: DISABLED_CONTENT_OPACITY,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    zIndex: 1,
  },
  compact: {
    paddingHorizontal: spacing.none,
  },
  fill: {
    width: '100%',
  },
  iconOnly: {
    aspectRatio: 1,
    borderRadius: radii.pill,
    height: sizes.button.default,
    width: sizes.button.default,
  },
  iconOnlySmall: {
    height: sizes.button.small,
    width: sizes.button.small,
  },
  normal: {
    minHeight: sizes.button.default,
    minWidth: sizes.button.default,
  },
  small: {
    minHeight: sizes.button.small,
    minWidth: sizes.button.small,
    paddingHorizontal: spacing.md,
  },
});
