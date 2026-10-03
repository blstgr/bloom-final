import type { ImageSourcePropType } from 'react-native';

/** Shown for a searched plant when no real photo was found. Its own module so the species cache's
 * storage adapter can name it without importing the whole resolution pipeline and its services. */
export const noPlantPhoto = require('../../../assets/images/no-plant-photo.jpg') as ImageSourcePropType;
