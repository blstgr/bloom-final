import type { ImageSourcePropType } from 'react-native';

import type { PlantLightNeed } from '../../../services/types';

export type PlantSpecies = {
  category: string;
  description: string;
  detailImage: ImageSourcePropType;
  detailImageUrl: string;
  image: ImageSourcePropType;
  /** Whether this species is toxic to cats/dogs (ASPCA-style toxicity, not human toxicity). */
  isToxicToPets: boolean;
  lightNeed: PlantLightNeed;
  speciesId: string;
  speciesName: string;
  wateringIntervalDays: number;
  /** Long, same-voice-as-description article for SpeciesInfoScreen. Only set for real
   * Perenual/DeepSeek-sourced species — mock seed species fall back to repeating `description`. */
  wikiArticle?: string;
};

export type OwnedPlant = {
  addedAt: string;
  customName: string;
  /** The user's actual plant photo; species/API images stay in PlantSpecies. */
  image: ImageSourcePropType;
  ownedPlantId: string;
  speciesId: string;
  /** Watering events, oldest first. Undo removes only the most recent entry. */
  wateringHistory: string[];
};

export type PlantDetection = {
  detectionId: string;
  /** Unset until species identification/lookup resolves. */
  generatedName?: string;
  image: ImageSourcePropType;
  /** Unset until species identification/lookup resolves — see PlantDataProvider's
   * identifyAndResolveSpecies/resolveSpeciesFromPerenualId. */
  speciesId?: string;
};

/** Who took a hotlinked Unsplash photo, and its page. */
export type PhotoCredit = { photographer: string; photoUrl: string };
