import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radii, spacing } from '../../../theme';
import { Badge } from '../Badge';
import { BadgePill } from '../BadgePill';
import { Touchable } from '../Touchable';

// Figma grid tile height, the same on Home, Favorites and Library.
const PLANT_CARD_HEIGHT = 178;

export type PlantCardBadge =
  | {
    icon?: 'water';
    label?: never;
    type: 'badge';
  }
  | {
    icon?: 'water';
    label: string;
    type: 'pill';
  };

export type PlantCardProps = {
  accessibilityLabel: string;
  badge?: PlantCardBadge;
  image: ImageSourcePropType;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function PlantCardComponent({
  accessibilityLabel,
  badge,
  image,
  onPress,
  style,
}: PlantCardProps) {
  return (
    <Touchable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, style]}>
      <Image resizeMode="cover" source={image} style={styles.image} />
      {badge ? (
        <View style={styles.badge}>
          {badge.type === 'badge' ? (
            <Badge icon={badge.icon ?? 'water'} variant="inverted" />
          ) : (
            <BadgePill
              icon={badge.icon ?? 'water'}
              label={badge.label}
              variant="inverted"
            />
          )}
        </View>
      ) : null}
    </Touchable>
  );
}

/** Memoized because the Home and Favorites grids re-render whenever *any* PlantDataProvider field
 * changes — including ones the grid doesn't read. A card only needs to re-render when its own
 * props change, so callers must pass a referentially stable `onPress` for this to take effect. */
export const PlantCard = React.memo(PlantCardComponent);

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
  },
  card: {
    borderRadius: radii.xxl,
    height: PLANT_CARD_HEIGHT,
    overflow: 'hidden',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
