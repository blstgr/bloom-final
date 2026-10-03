import { loadSpeciesCache, saveSpeciesCache } from './speciesCacheStorage';
import type { PlantSpecies } from './types';

/** Enough for every plant a person realistically looks up; the least recently opened falls off
 * past it. */
export const MAX_STORED_SPECIES = 100;

/**
 * Searched plants Bloom has already written up: held in memory for synchronous reads, and the
 * {@link MAX_STORED_SPECIES} most recently opened kept on the device (spec §3.8).
 *
 * Owns the recency order, the cap, the hydration guard and every save, so the provider only says
 * what happened: a plant was written up, a plant was opened.
 */
export type SpeciesCache = {
  /** Holds a newly written-up species as the most recently opened. False if one was already held
   * under its id, which is kept. */
  add: (species: PlantSpecies) => boolean;
  get: (speciesId: string) => PlantSpecies | undefined;
  /** Reads the stored cache back once (repeat calls share the read). Anything added during the
   * read is newer, so it stays first and keeps its entry. Resolves true if anything was restored. */
  hydrate: () => Promise<boolean>;
  /** Moves a held species to the front, so reopening it keeps it from falling off. Ignores ids it
   * does not hold (shipped plants). */
  markOpened: (speciesId: string) => void;
};

export function createSpeciesCache(): SpeciesCache {
  let entries: Record<string, PlantSpecies> = {};
  // Most recently opened first. A separate list because a Record orders numeric keys (Perenual
  // ids) by number, not by insertion.
  let order: string[] = [];
  // Saving before the stored cache is read back would overwrite it with this session's few plants.
  let hasHydrated = false;
  let hydration: Promise<boolean> | null = null;

  function commitOrder(nextOrder: string[], persist = hasHydrated) {
    order = nextOrder.slice(0, MAX_STORED_SPECIES);
    if (persist) saveSpeciesCache(order.map(id => entries[id]));
  }

  function moveToFront(speciesId: string) {
    commitOrder([speciesId, ...order.filter(id => id !== speciesId)]);
  }

  return {
    add(species) {
      if (entries[species.speciesId]) return false;
      entries = { ...entries, [species.speciesId]: species };
      moveToFront(species.speciesId);
      return true;
    },
    get: speciesId => entries[speciesId],
    hydrate() {
      hydration ??= loadSpeciesCache().then(stored => {
        const restored = stored.filter(species => !entries[species.speciesId]);
        restored.forEach(species => {
          entries = { ...entries, [species.speciesId]: species };
        });
        // Plants added during the read are only in memory so far, so the merged list is saved —
        // whether or not the stored list was already full.
        const addedDuringRead = order.length > 0;
        hasHydrated = true;
        commitOrder([...order, ...restored.map(species => species.speciesId)], addedDuringRead);
        return restored.length > 0;
      });
      return hydration;
    },
    markOpened(speciesId) {
      if (!entries[speciesId] || order[0] === speciesId) return;
      moveToFront(speciesId);
    },
  };
}
