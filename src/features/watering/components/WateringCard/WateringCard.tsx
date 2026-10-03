import React from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { BadgePill } from '../../../../components/ui/BadgePill';
import { Icon } from '../../../../components/ui/Icon';
import { Photo } from '../../../../components/ui/Photo';
import { Touchable } from '../../../../components/ui/Touchable';
import { makeThemedStyles, radii, spacing, useTheme } from '../../../../theme';

const CARD_HEIGHT = 130;
const CARD_MAX_WIDTH = 361;
const CARD_HORIZONTAL_MARGIN_COUNT = 2;
const COLLAPSE_DURATION_MS = 180;
const SWIPE_FRICTION = 1.8;
const SWIPE_RIGHT_THRESHOLD = 96;
const REVEAL_FADE_START = 0.65;
const REVEAL_FADE_END = 0.8;
const REVEAL_CHECK_FADE_MID = 0.2;

export type WateringCardProps = {
  accessibilityLabel: string;
  day: string;
  image: ImageSourcePropType;
  month: string;
  onDismiss?: () => void;
  onPress?: () => void;
};

export function WateringCard({
  accessibilityLabel,
  day,
  image,
  month,
  onDismiss,
  onPress,
}: WateringCardProps) {
  const { width } = useWindowDimensions();
  const themedStyles = useThemedStyles();
  const cardWidth = Math.min(width - spacing.md * CARD_HORIZONTAL_MARGIN_COUNT, CARD_MAX_WIDTH);
  const [dismissed, setDismissed] = React.useState(false);
  const collapse = useSharedValue(1);
  const revealWidth = cardWidth;

  const handleDismiss = React.useCallback(() => {
    if (dismissed) return;
    setDismissed(true);
    collapse.value = withTiming(0, { duration: COLLAPSE_DURATION_MS }, finished => {
      if (finished && onDismiss) runOnJS(onDismiss)();
    });
  }, [collapse, dismissed, onDismiss]);

  const dismissedStyle = useAnimatedStyle(() => ({
    height: interpolate(collapse.value, [0, 1], [0, CARD_HEIGHT]),
    opacity: collapse.value,
  }));

  if (dismissed) {
    return <Reanimated.View style={[styles.dismissed, dismissedStyle]} />;
  }

  return (
    <Swipeable
      containerStyle={[styles.container, { width: cardWidth }]}
      friction={SWIPE_FRICTION}
      overshootRight={false}
      rightThreshold={SWIPE_RIGHT_THRESHOLD}
      renderRightActions={(_, translation) => (
        <RightActionReveal revealWidth={revealWidth} translation={translation} />
      )}
      onSwipeableOpen={handleDismiss}>
      <Touchable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.card, themedStyles.underlay, { width: cardWidth }]}>
        {/* The photo paints its own underlay, so its opacity lets that through, not the green card
            behind it. */}
        <Photo
          resizeMode="cover"
          source={image}
          style={[styles.image, { width: cardWidth }]}
          underlay
        />
        <View pointerEvents="none" style={styles.badge}>
          <BadgePill day={day} icon="water" month={month} variant="inverted" />
        </View>
      </Touchable>
    </Swipeable>
  );
}

function RightActionReveal({
  revealWidth,
  translation,
}: {
  revealWidth: number;
  translation: { value: number };
}) {
  const dropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.min(Math.max(-translation.value, 0), revealWidth) / revealWidth,
      [0, REVEAL_FADE_START, REVEAL_FADE_END],
      [1, 1, 0],
    ),
  }));

  const theme = useTheme();
  const themedStyles = useThemedStyles();

  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.min(Math.max(-translation.value, 0), revealWidth) / revealWidth,
      [REVEAL_FADE_START, REVEAL_FADE_END, 1],
      [0, REVEAL_CHECK_FADE_MID, 1],
    ),
  }));

  return (
    <View style={[styles.reveal, themedStyles.underlay, { width: revealWidth }]}>
      <Reanimated.View style={[styles.iconOverlay, dropStyle]}>
        <Icon color={theme.colors.icon.onAccent} name="water" />
      </Reanimated.View>
      <Reanimated.View style={[styles.iconOverlay, checkStyle]}>
        <Icon color={theme.colors.icon.onAccent} name="check" />
      </Reanimated.View>
    </View>
  );
}

const useThemedStyles = makeThemedStyles(theme => ({
  // The card and the swipe reveal behind it: the "watered" green the swipe uncovers.
  underlay: {
    backgroundColor: theme.colors.success,
  },
}));

const styles = StyleSheet.create({
  badge: {
    bottom: spacing.md,
    justifyContent: 'center',
    right: spacing.md,
    position: 'absolute',
    top: spacing.md,
  },
  container: {
    borderRadius: radii.photo,
    overflow: 'hidden',
  },
  card: {
    borderRadius: radii.photo,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  dismissed: {
    overflow: 'hidden',
  },
  iconOverlay: {
    position: 'absolute',
    right: spacing.xl,
  },
  image: {
    borderRadius: radii.photo,
    height: CARD_HEIGHT,
    overflow: 'hidden',
    position: 'absolute',
  },
  reveal: {
    alignItems: 'flex-end',
    bottom: spacing.none,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    paddingRight: spacing.xl,
  },
});
