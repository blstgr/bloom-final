import React from 'react';
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { AppText } from '../../../../components/ui/AppText';
import { EditableTitle } from '../../../../components/ui/EditableTitle';
import { Photo } from '../../../../components/ui/Photo';
import { layout, spacing } from '../../../../theme';

type PlantDetailBaseProps = {
  category: string;
  description: string;
  image: ImageSourcePropType;
  name: string;
  schedule?: React.ReactNode;
};

type ReadonlyPlantDetailProps = PlantDetailBaseProps & {
  nameMaxLength?: never;
  onNameSubmit?: never;
};

type EditablePlantDetailProps = PlantDetailBaseProps & {
  nameMaxLength?: number;
  onNameSubmit: (value: string) => boolean;
};

export type PlantDetailProps = ReadonlyPlantDetailProps | EditablePlantDetailProps;

const MIN_DETAIL_IMAGE_HEIGHT = 260;

export function PlantDetail({
  category,
  description,
  image,
  name,
  nameMaxLength,
  onNameSubmit,
  schedule,
}: PlantDetailProps) {
  return (
    <View style={styles.container}>
      <Photo
        resizeMode="cover"
        source={image}
        style={styles.imageFrame}
      />
      <View style={styles.content}>
        <View style={styles.copy}>
          <View style={styles.titleStack}>
            {onNameSubmit ? (
              <EditableTitle
                align="left"
                maxLength={nameMaxLength}
                onSubmit={onNameSubmit}
                value={name}
                variant="titleXl"
              />
            ) : (
              <AppText variant="titleXl">{name}</AppText>
            )}
            <AppText tone="highlighted">{category}</AppText>
          </View>
          <AppText>{description}</AppText>
        </View>
        {schedule ? <View style={styles.schedule}>{schedule}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xxl,
  },
  copy: {
    gap: spacing.md,
  },
  imageFrame: {
    flex: 1,
    minHeight: MIN_DETAIL_IMAGE_HEIGHT,
    overflow: 'hidden',
    width: '100%',
  },
  schedule: {
    width: '100%',
  },
  titleStack: {
    gap: spacing.xxs,
  },
});
