import React from 'react';
import {
  ImageBackground,
  type ImageResizeMode,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { makeThemedStyles } from '../../../theme';

export type PhotoProps = {
  resizeMode?: ImageResizeMode;
  source: ImageSourcePropType;
  /** The frame: its size, radius and clipping. The image fills it. */
  style?: StyleProp<ViewStyle>;
  /**
   * Paints the opaque photo underlay behind the image. Needed where something would otherwise show
   * through the dimmed photo (a hero floating over text, a card over a coloured layer) or where a
   * placeholder should show while a remote photo loads.
   */
  underlay?: boolean;
};

/**
 * Every plant photo in the app. Owns the photo treatment (docs/dark-mode-spec.md §1, "photo
 * opacity"): dark mode dims photos a little so they don't glare against the night background,
 * light shows them at full strength.
 */
export function Photo({ resizeMode, source, style, underlay = false }: PhotoProps) {
  const themedStyles = useThemedStyles();

  return (
    <ImageBackground
      imageStyle={themedStyles.image}
      resizeMode={resizeMode}
      source={source}
      style={[style, underlay && themedStyles.underlay]}
    />
  );
}

const useThemedStyles = makeThemedStyles(theme => ({
  image: {
    opacity: theme.components.photo.opacity,
  },
  underlay: {
    backgroundColor: theme.components.photo.underlay,
  },
}));
