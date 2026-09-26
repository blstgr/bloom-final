import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OwnedPlant } from './types';

const OWNED_PLANTS_STORAGE_KEY = 'bloom.ownedPlants.v1';

/**
 * Owned plants are the one thing in this app the user cannot recreate.
 *
 * A species can be looked up again and a favorite re-hearted, but `wateringHistory` is a record
 * of what someone actually did, and the entire watering schedule is computed from its last
 * entry. Losing it on relaunch silently reset every plant's schedule.
 */
export async function loadOwnedPlants(): Promise<OwnedPlant[] | null> {
  try {
    const raw = await AsyncStorage.getItem(OWNED_PLANTS_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    // A hand-edited or half-written entry must not crash the launch; falling back to the seed
    // data loses saved plants, which is bad, but an app that cannot start is worse.
    return Array.isArray(parsed) ? (parsed as OwnedPlant[]) : null;
  } catch {
    return null;
  }
}

export async function saveOwnedPlants(ownedPlants: OwnedPlant[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OWNED_PLANTS_STORAGE_KEY, JSON.stringify(ownedPlants));
  } catch {
    // Best effort: the add/water/rename the user just performed still succeeded in memory, and
    // interrupting it with a storage error would be a worse trade than losing the write.
  }
}
