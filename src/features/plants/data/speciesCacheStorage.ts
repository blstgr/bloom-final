import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSourcePropType } from 'react-native';

import { noPlantPhoto } from './noPlantPhoto';
import type { PlantSpecies } from './types';

// v2: species are stored without the no-photo acknowledgment, which is now added when one is
// shown (speciesResolution.presentSpecies). v1 entries could carry it baked into their copy.
const SPECIES_CACHE_STORAGE_KEY = 'bloom.speciesCache.v2';

/**
 * Searched plants Bloom has already written up, most recently opened first. The order and the
 * cap belong to speciesCache.ts; this only reads and writes the list it is given.
 *
 * Each one cost a Perenual lookup and a DeepSeek article; without this, reopening the plant after a
 * relaunch paid for both again and showed a different article.
 */
export async function loadSpeciesCache(): Promise<PlantSpecies[]> {
  try {
    const raw = await AsyncStorage.getItem(SPECIES_CACHE_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isStoredSpecies).map(species => ({
      ...species,
      detailImage: storableImage(species.detailImage),
      image: storableImage(species.image),
    }));
  } catch {
    // An unreadable cache costs a re-lookup, never a launch.
    return [];
  }
}

export async function saveSpeciesCache(species: PlantSpecies[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      SPECIES_CACHE_STORAGE_KEY,
      JSON.stringify(species),
    );
  } catch {
    // Best effort: the plant is still open and cached for this session.
  }
}

/** A photo URL survives a relaunch; a bundled image is a module number that can change between
 * builds, and the only bundled image a searched plant carries is the no-photo placeholder. */
function storableImage(image: ImageSourcePropType): ImageSourcePropType {
  return typeof image === 'object' && image != null && 'uri' in image ? image : noPlantPhoto;
}

function isStoredSpecies(value: unknown): value is PlantSpecies {
  if (typeof value !== 'object' || value == null) return false;
  const species = value as Record<string, unknown>;

  return (
    typeof species.speciesId === 'string' &&
    typeof species.speciesName === 'string' &&
    typeof species.category === 'string' &&
    typeof species.description === 'string' &&
    typeof species.wateringIntervalDays === 'number' &&
    typeof species.isToxicToPets === 'boolean' &&
    (species.lightNeed === 'bright' || species.lightNeed === 'low') &&
    (species.wikiArticle === undefined || typeof species.wikiArticle === 'string')
  );
}
