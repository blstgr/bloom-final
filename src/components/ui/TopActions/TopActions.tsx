import React from 'react';
import { type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radii, sizes, spacing } from '../../../theme';
import { AppText } from '../AppText';
import { GlassView } from '../GlassView';
import { Icon, type IconName } from '../Icon';
import { Touchable } from '../Touchable';

type TopActionsBaseProps = {
  onMore?: () => void;
  onRightPress?: () => void;
  rightAccessibilityState?: AccessibilityState;
  rightIcon?: IconName;
  rightLabel?: string;
  style?: StyleProp<ViewStyle>;
  title?: ReactNode;
};

type CenteredTopActionsProps = TopActionsBaseProps & {
  mode?: 'centered';
  leftAccessibilityState?: AccessibilityState;
  leftIcon?: IconName;
  leftLabel?: string;
  onClose?: () => void;
  onLeftPress?: () => void;
};

type HeroTopActionsProps = TopActionsBaseProps & {
  leftAccessibilityState?: never;
  leftIcon?: never;
  leftLabel?: never;
  mode: 'hero';
  onClose?: never;
  onLeftPress?: never;
};

export type TopActionsProps = CenteredTopActionsProps | HeroTopActionsProps;

const HERO_TITLE_WIDTH = 198;

function TopActionButton({
  accessibilityState,
  icon,
  label,
  onPress,
}: {
  accessibilityState?: AccessibilityState;
  icon: IconName;
  label: string;
  onPress?: () => void;
}) {
  return (
    // No shadow: Figma's round secondary button (`506:4211`) carries the glass and rim only.
    <GlassView shadow={false} style={styles.topActionButtonWrap}>
      <Touchable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        onPress={onPress}
        ripple="borderless"
        style={styles.topActionButton}>
        {/* No colour passed: Icon picks the theme's, which keeps a filled heart in its own colour. */}
        <Icon name={icon} size={sizes.icon.md} />
      </Touchable>
    </GlassView>
  );
}

function renderAction(
  icon: IconName | undefined,
  label: string | undefined,
  onPress: (() => void) | undefined,
  accessibilityState?: AccessibilityState,
) {
  if (!icon) return null;

  return (
    <TopActionButton
      accessibilityState={accessibilityState}
      icon={icon}
      label={label ?? icon}
      onPress={onPress}
    />
  );
}

export function TopActions(props: TopActionsProps) {
  const {
    mode = 'centered',
    onMore,
    onRightPress,
    rightAccessibilityState,
    rightIcon,
    rightLabel,
    style,
    title,
  } = props;
  const resolvedRightAction = renderAction(
    rightIcon ?? (onMore ? 'more' : undefined),
    rightLabel ?? (onMore ? 'More options' : undefined),
    onRightPress ?? onMore,
    rightAccessibilityState,
  );

  if (mode === 'hero') {
    return (
      <View style={[styles.heroContainer, style]}>
        <View style={styles.heroTitleWrap}>
          {typeof title === 'string' ? (
            <AppText style={styles.heroTitle} variant="titleXl">
              {title}
            </AppText>
          ) : title}
        </View>
        <View style={styles.heroSide}>{resolvedRightAction}</View>
      </View>
    );
  }

  const resolvedLeftAction = renderAction(
    props.leftIcon ?? (props.onClose ? 'close' : undefined),
    props.leftLabel ?? (props.onClose ? 'Close' : undefined),
    props.onLeftPress ?? props.onClose,
    props.leftAccessibilityState,
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.side}>{resolvedLeftAction}</View>
      <View style={styles.titleWrap}>
        {typeof title === 'string' ? <AppText variant="titleS">{title}</AppText> : title}
      </View>
      <View style={styles.side}>{resolvedRightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: sizes.button.small,
    width: '100%',
  },
  heroContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  heroSide: {
    alignItems: 'center',
    height: sizes.button.small,
    justifyContent: 'center',
    width: sizes.button.small,
  },
  heroTitle: {
    width: HERO_TITLE_WIDTH,
  },
  heroTitleWrap: {
    flex: 1,
  },
  side: {
    alignItems: 'center',
    height: sizes.button.small,
    justifyContent: 'center',
    width: sizes.button.small,
  },
  topActionButtonWrap: {
    height: sizes.button.small,
    width: sizes.button.small,
  },
  topActionButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: sizes.button.small,
    justifyContent: 'center',
    width: sizes.button.small,
  },
  titleWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
