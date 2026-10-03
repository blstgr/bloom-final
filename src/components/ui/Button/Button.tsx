import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, radii, shadows, sizes, spacing } from '../../../theme';
import { AppText } from '../AppText';
import { GlassView } from '../GlassView';
import { GradientBorder } from '../GradientBorder';
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
  const [buttonLayout, setButtonLayout] = React.useState<{ width: number; height: number } | null>(null);
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  const foreground = isPrimary ? colors.text.inverse : colors.text.primary;
  const hasLabel = Boolean(label);
  const isIconOnly = iconOnly || (!hasLabel && Boolean(icon));
  const loaderTone = isPrimary ? 'onDark' : 'onLight';
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
            <AppText variant="button" tone={isPrimary ? 'inverse' : 'primary'}>
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
        style={[...touchableStyle, styles.primary]}
        onLayout={event => setButtonLayout(event.nativeEvent.layout)}
        {...pressableProps}>
        {content}
      </Touchable>
    );

    // Android: a flat Material filled button — no rim, no elevation (docs/search-spec.md §5). The
    // pill clips the ripple to its own shape.
    if (Platform.OS === 'android') {
      return <View style={[outerStyle, styles.shadowWrapper]}>{touchable}</View>;
    }

    return (
      // Shadow lives on this outer wrapper, never on the same View doing the pill-shape
      // clipping (overflow: 'hidden' always clips a shadow rendered on that same layer).
      <View style={[outerStyle, styles.primaryShadow]}>
        <View style={[styles.shadowWrapper, styles.shadowWrapperOpaque]}>
          <GradientBorder
            borderRadius={radii.pill}
            colors={[...gradients.glassBorder]}
            style={styles.buttonSurface}>
            {touchable}
          </GradientBorder>
        </View>
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
  shadowWrapperOpaque: {
    backgroundColor: colors.surface.white,
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
  buttonSurface: {
    zIndex: 1,
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
  primary: {
    backgroundColor: colors.action.primary,
  },
  small: {
    minHeight: sizes.button.small,
    minWidth: sizes.button.small,
    paddingHorizontal: spacing.md,
  },
});
