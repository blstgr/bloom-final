import React from 'react';
import type { ImageSourcePropType } from 'react-native';

import { searchSpecies } from '../../../services/plantApi';
import { identifyPlant, resolveIdentification } from '../../../services/plantIdApi';
import type { PerenualSpeciesListItem } from '../../../services/types';
import { pushRecentItem } from '../../../store/recentItems';

import { getSpeciesById as getCatalogSpeciesById } from './catalog';
import {
  initialOwnedPlants as defaultInitialOwnedPlants,
} from './mockPlants';
import { loadOwnedPlants, saveOwnedPlants } from './ownedPlantsStorage';
import { createSpeciesCache } from './speciesCache';
import {
  assemblePlantSpecies,
  hasKnownName,
  presentSpecies,
  type ResolvedSpeciesCore,
  resolveSpeciesCore,
  type SpeciesLookupFailureReason,
  toLookupFailureReason,
  toStoredSpecies,
} from './speciesResolution';
import type { OwnedPlant, PlantDetection, PlantSpecies } from './types';

type PlantNameSaveResult =
  | {
      duplicate: false;
      ownedPlantId: string;
    }
  | {
      duplicate: true;
      message: string;
    };

export type SpeciesLookupResult =
  | { reason: SpeciesLookupFailureReason; success: false }
  | { species: PlantSpecies; success: true };

export type PlantDataContextValue = {
  addSearchHistoryEntry: (species: PlantSpecies) => void;
  createDetection: (image: PlantDetection['image']) => PlantDetection;
  deleteOwnedPlant: (ownedPlantId: string) => void;
  detections: PlantDetection[];
  getDetectionById: (detectionId: string | undefined) => PlantDetection | undefined;
  getOwnedPlantById: (ownedPlantId: string | undefined) => OwnedPlant | undefined;
  getSpeciesById: (speciesId: string | undefined) => PlantSpecies | undefined;
  /** Shared by AddPlantLoaderScreen and LibraryScreen's photo search so the two flows can never
   * disagree on what counts as a confident identification. */
  identifyAndResolveSpecies: (image: ImageSourcePropType) => Promise<SpeciesLookupResult>;
  /** Used internally by identifyAndResolveSpecies to turn an accepted Pl@ntNet name into a
   * Perenual match. Exposed for cases with only a name and no exact Perenual id in hand.
   * `fallbackImage`, when given, is preferred over the generic no-photo asset if no real photo
   * is found for the resolved species. */
  lookupSpeciesByName: (name: string, fallbackImage?: ImageSourcePropType) => Promise<SpeciesLookupResult>;
  /** SpeciesInfoScreen reports each plant it shows, so a stored plant reopened stays among the
   * most recently opened rather than falling off by when it was first written up (spec §3.8). */
  markSpeciesOpened: (speciesId: string) => void;
  markWatered: (ownedPlantId: string) => void;
  ownedPlants: OwnedPlant[];
  renameOwnedPlant: (ownedPlantId: string, customName: string) => PlantNameSaveResult;
  /** Attaches a resolved species (and the generated name that depends on it) to a detection that
   * was created before identification/lookup completed. */
  resolveDetectionSpecies: (detectionId: string, species: PlantSpecies) => void;
  /** Resolves a specific, already-known Perenual species id (cache-checked) — used by plant search
   * for an exact typed-search result, and by SpeciesInfoScreen to resolve in place when navigated
   * to before resolution has completed (optimistic navigation). `knownName`, when the caller has
   * it, skips the live (confirmed permanently blocked) species/details call entirely in favor of
   * speciesDetailsFallback.ts's synthesized response — never to invent a name shown to the user. */
  resolveSpeciesById: (
    perenualId: number,
    fallbackImage?: ImageSourcePropType,
    knownName?: string,
  ) => Promise<SpeciesLookupResult>;
  saveDetection: (detectionId: string, customName: string) => PlantNameSaveResult;
  /** Most-recently-opened species from plant search, newest first. */
  searchHistory: PlantSpecies[];
  unmarkWatered: (ownedPlantId: string) => void;
};

const INITIAL_DETECTION_INDEX = 1;
const INITIAL_OWNED_PLANT_INDEX = 1;
const FIRST_DUPLICATE_SUFFIX = 2;
const FIRST_MATCH_INDEX = 0;
const MAX_LOGGED_CANDIDATES = 3;
const SCORE_LOG_DECIMAL_PLACES = 2;
// Stands in for "no knownName" as a speciesCoreInFlightRef key — never a real name, since callers
// only ever pass a non-empty knownName.
const NO_KNOWN_NAME_KEY = '';
const FIRST_KEY_INDEX = 0;

/** Explicit, named check rather than relying on `knownName`'s JS truthiness inline everywhere —
 * makes "an empty string counts the same as no name at all" a deliberate, documented rule instead
 * of an implicit side effect of the `?string` type allowing `''` in the first place. */
const PlantDataContext = React.createContext<PlantDataContextValue | null>(null);

type PlantDataProviderProps = {
  children: React.ReactNode;
  initialOwnedPlants?: OwnedPlant[];
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export function findDuplicateName(name: string, ownedPlants: OwnedPlant[], excludeOwnedPlantId?: string) {
  const normalized = normalizeName(name);
  return ownedPlants.some(
    plant => plant.ownedPlantId !== excludeOwnedPlantId && normalizeName(plant.customName) === normalized,
  );
}

export function buildDuplicateNameMessage(name: string) {
  return `You already have a ${name}. Save this one under a different name or discard`;
}

function buildGeneratedName(speciesName: string, ownedPlants: OwnedPlant[]) {
  const existingNames = new Set(ownedPlants.map(plant => normalizeName(plant.customName)));
  if (!existingNames.has(normalizeName(speciesName))) return speciesName;

  let suffix = FIRST_DUPLICATE_SUFFIX;
  while (existingNames.has(normalizeName(`${speciesName} ${suffix}`))) {
    suffix += 1;
  }

  return `${speciesName} ${suffix}`;
}

function getNextOwnedPlantIndex(ownedPlants: OwnedPlant[]) {
  return ownedPlants.reduce((nextIndex, plant) => {
    const match = /^owned-plant-(\d+)$/.exec(plant.ownedPlantId);
    if (!match) return nextIndex;

    return Math.max(nextIndex, Number(match[1]) + 1);
  }, INITIAL_OWNED_PLANT_INDEX);
}

export function PlantDataProvider({
  children,
  initialOwnedPlants = defaultInitialOwnedPlants,
}: PlantDataProviderProps) {
  const [ownedPlants, setOwnedPlants] = React.useState<OwnedPlant[]>(initialOwnedPlants);
  // Guards the save effect below: without it the first render would immediately write the seed
  // data over whatever is on disk, before the read that would have restored it has landed.
  const hasHydratedRef = React.useRef(false);
  const [detections, setDetections] = React.useState<PlantDetection[]>([]);
  const [searchHistory, setSearchHistory] = React.useState<PlantSpecies[]>([]);
  const [speciesCacheVersion, setSpeciesCacheVersion] = React.useState(0);
  const ownedPlantsRef = React.useRef<OwnedPlant[]>(initialOwnedPlants);
  const detectionIndexRef = React.useRef(INITIAL_DETECTION_INDEX);
  const ownedPlantIndexRef = React.useRef(getNextOwnedPlantIndex(initialOwnedPlants));
  const [speciesCache] = React.useState(createSpeciesCache);
  // Each stored species' on-screen form, made once so getSpeciesById hands every render the same
  // object. Stored species are never replaced in place, so the stored object is a safe key.
  const presentedSpeciesRef = React.useRef(new WeakMap<PlantSpecies, PlantSpecies>());
  const speciesCoreCacheRef = React.useRef<Record<string, ResolvedSpeciesCore>>({});
  // Per speciesId, a map from "shape of work" to its in-flight promise — keyed by the exact
  // knownName string, with `NO_KNOWN_NAME_KEY` standing in for "no knownName" (never a real name,
  // since callers only ever pass a non-empty one). Every distinct shape gets its own independent
  // key so any combination of concurrent callers for the same speciesId — two different known
  // names, a knownName alongside a no-knownName caller, several of the same name — can each finish
  // and clean up on their own without disturbing another still-pending entry. An earlier version
  // of this used one shared slot per shape (or no shape distinction at all); both let one entry's
  // completion delete or overwrite another still-pending entry for the same speciesId, so a later
  // caller would see nothing in flight (or the wrong one) and start a duplicate resolveSpeciesCore
  // call, or silently receive a different caller's name/result — the exact problems this map
  // exists to prevent.
  const speciesCoreInFlightRef = React.useRef<Record<string, Record<string, Promise<ResolvedSpeciesCore>>>>({});

  const createDetection = React.useCallback((image: PlantDetection['image']) => {
    const detection: PlantDetection = {
      detectionId: `detection-${detectionIndexRef.current}`,
      image,
    };

    detectionIndexRef.current += 1;
    setDetections(current => [...current, detection]);
    return detection;
  }, []);

  const resolveDetectionSpecies = React.useCallback((detectionId: string, species: PlantSpecies) => {
    setDetections(current =>
      current.map(detection =>
        detection.detectionId === detectionId
          ? {
              ...detection,
              generatedName: buildGeneratedName(species.speciesName, ownedPlantsRef.current),
              speciesId: species.speciesId,
            }
          : detection,
      ),
    );
  }, []);

  const getDetectionByIdFromState = React.useCallback(
    (detectionId: string | undefined) =>
      detections.find(detection => detection.detectionId === detectionId),
    [detections],
  );

  const getSpeciesById = React.useCallback(
    (speciesId: string | undefined) => {
      if (!speciesId) return undefined;
      const stored = speciesCache.get(speciesId);
      if (!stored) return getCatalogSpeciesById(speciesId);

      let presented = presentedSpeciesRef.current.get(stored);
      if (!presented) {
        presented = presentSpecies(stored);
        presentedSpeciesRef.current.set(stored, presented);
      }
      return presented;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speciesCacheVersion drives re-reads of the cache
    [speciesCache, speciesCacheVersion],
  );

  const resolveSpeciesById = React.useCallback(
    async (
      perenualId: number,
      fallbackImage?: ImageSourcePropType,
      knownName?: string,
    ): Promise<SpeciesLookupResult> => {
      const speciesId = String(perenualId);

      // Only the shared "core" (Perenual/Unsplash/DeepSeek work, identical for every caller) is
      // cached/de-duped here — never the final assembled species. Baking a caller's fallbackImage
      // into a shared cache/in-flight entry would let whichever caller resolves first decide the
      // image (and hasPhoto-dependent description) for every other concurrent caller too.
      let core = speciesCoreCacheRef.current[speciesId];
      if (!core) {
        // Written up in an earlier session: restored from storage, which keeps the species but not
        // its core. Reuse it rather than paying Perenual/Unsplash/DeepSeek again for a result the
        // cache would then discard.
        const stored = speciesCache.get(speciesId);
        if (stored) return { species: presentSpecies(stored, fallbackImage), success: true };

        const slot = speciesCoreInFlightRef.current[speciesId] ?? {};
        const knownNameKeys = Object.keys(slot).filter(key => key !== NO_KNOWN_NAME_KEY);
        // A caller with a knownName resolves instantly via the synthesized fallback (see the
        // knownName skip in resolveSpeciesCore) and must never be forced to piggyback on an
        // in-flight entry that was started WITHOUT one — that entry is doomed to hit the
        // confirmed-blocked live species/details call and fail, which would otherwise drag an
        // otherwise-succeeding knownName caller down with it. A caller with no knownName has no
        // faster option of its own, so it prefers whichever knownName resolution is already in
        // flight (any one — all are equally "better" than the doomed no-knownName path) over
        // starting or joining that path itself. A knownName caller only ever reuses an existing
        // entry keyed by that SAME name — two different names for the same speciesId must never
        // silently collapse into one caller's result.
        let inFlightKey: string;
        let inFlightPromise: Promise<ResolvedSpeciesCore>;

        if (hasKnownName(knownName) && knownName in slot) {
          inFlightKey = knownName;
          inFlightPromise = slot[knownName];
        } else if (!hasKnownName(knownName) && knownNameKeys.length > 0) {
          inFlightKey = knownNameKeys[FIRST_KEY_INDEX];
          inFlightPromise = slot[inFlightKey];
        } else if (!hasKnownName(knownName) && NO_KNOWN_NAME_KEY in slot) {
          inFlightKey = NO_KNOWN_NAME_KEY;
          inFlightPromise = slot[NO_KNOWN_NAME_KEY];
        } else {
          inFlightKey = hasKnownName(knownName) ? knownName : NO_KNOWN_NAME_KEY;
          inFlightPromise = resolveSpeciesCore(perenualId, knownName);
          speciesCoreInFlightRef.current[speciesId] = { ...slot, [inFlightKey]: inFlightPromise };
        }

        try {
          core = await inFlightPromise;
        } catch (error) {
          // Recoverable, expected outcome (not a bug) — console.warn, not console.error, so this
          // doesn't trip React Native's red LogBox on top of the AlertModal/failure state the UI
          // already shows for this.
          console.warn('resolveSpeciesById failed', error);
          return { reason: toLookupFailureReason(error), success: false };
        } finally {
          // Only clear this entry's own key, and only if it's still the promise we awaited —
          // another key (a different name, or the no-knownName one) may still have a genuinely
          // separate, independently-pending resolution for this same speciesId.
          const currentSlot = speciesCoreInFlightRef.current[speciesId];
          if (currentSlot?.[inFlightKey] === inFlightPromise) {
            const nextSlot = { ...currentSlot };
            delete nextSlot[inFlightKey];
            if (Object.keys(nextSlot).length === 0) {
              delete speciesCoreInFlightRef.current[speciesId];
            } else {
              speciesCoreInFlightRef.current[speciesId] = nextSlot;
            }
          }
        }

        speciesCoreCacheRef.current[speciesId] = core;
      }

      const species = assemblePlantSpecies(perenualId, core, fallbackImage);

      // The persisted, synchronously-readable cache (getSpeciesById — search history, future
      // lookups) always stores the species as written up, with no caller's fallback image and no
      // display wording, regardless of which caller resolved it first, so a photo-add flow's own
      // captured photo never becomes another unrelated lookup's species image. Readers present it.
      if (!speciesCache.get(speciesId)) {
        speciesCache.add(toStoredSpecies(perenualId, core));
        setSpeciesCacheVersion(version => version + 1);
      }

      return { species, success: true };
    },
    [speciesCache],
  );

  const markSpeciesOpened = React.useCallback(
    (speciesId: string) => speciesCache.markOpened(speciesId),
    [speciesCache],
  );

  const lookupSpeciesByName = React.useCallback(
    async (name: string, fallbackImage?: ImageSourcePropType): Promise<SpeciesLookupResult> => {
      let results: PerenualSpeciesListItem[];
      try {
        results = await searchSpecies(name);
      } catch (error) {
        // Recoverable, expected outcome (not a bug) — console.warn, not console.error, so this
        // doesn't trip React Native's red LogBox on top of the AlertModal/failure state the UI
        // already shows for this.
        console.warn('lookupSpeciesByName: searchSpecies failed', error);
        return { reason: toLookupFailureReason(error), success: false };
      }

      const match = results[FIRST_MATCH_INDEX];
      if (!match) {
        // A recoverable, expected outcome (not a bug) — console.warn, not console.error, so this
        // doesn't trip React Native's red LogBox. Perenual's species-list has no free-text search
        // logging of its own, so this is the only way to see which exact name (often Pl@ntNet's
        // raw commonName/scientificName, not something the user ever sees) failed to match.
        console.warn(`lookupSpeciesByName: no Perenual match for "${name}"`);
        return { reason: 'no-perenual-match', success: false };
      }

      return resolveSpeciesById(match.id, fallbackImage, match.common_name);
    },
    [resolveSpeciesById],
  );

  const identifyAndResolveSpecies = React.useCallback(
    async (image: ImageSourcePropType): Promise<SpeciesLookupResult> => {
      let candidates;
      try {
        candidates = await identifyPlant(image);
      } catch (error) {
        // Recoverable, expected outcome (not a bug) — console.warn, not console.error, so this
        // doesn't trip React Native's red LogBox on top of the AlertModal/failure state the UI
        // already shows for this.
        console.warn('identifyAndResolveSpecies: identifyPlant failed', error);
        return { reason: toLookupFailureReason(error), success: false };
      }

      const identification = resolveIdentification(candidates);
      if (!identification.accepted) {
        // Recoverable, expected outcome (not a bug) — console.warn, not console.error, so this
        // doesn't trip React Native's red LogBox. Without this, a low-confidence/no-candidates
        // rejection is silent: there's no way to tell whether Pl@ntNet was close (a borderline
        // score) or wildly off, which is exactly the question when a photo unexpectedly fails.
        const topCandidates = candidates
          .slice(0, MAX_LOGGED_CANDIDATES)
          .map(candidate => {
            const name = candidate.species.commonNames[FIRST_MATCH_INDEX] ?? candidate.species.scientificNameWithoutAuthor;
            return `${name} (${candidate.score.toFixed(SCORE_LOG_DECIMAL_PLACES)})`;
          })
          .join(', ');
        console.warn(
          `identifyAndResolveSpecies: rejected (${identification.reason}) — top candidates: ${topCandidates || 'none'}`,
        );
        return { reason: identification.reason, success: false };
      }

      const { species: candidateSpecies } = identification.candidate;
      const commonName = candidateSpecies.commonNames[FIRST_MATCH_INDEX];
      const scientificName = candidateSpecies.scientificNameWithoutAuthor;
      const genusName = candidateSpecies.genus.scientificNameWithoutAuthor;

      // Perenual's text index doesn't always contain the exact name Pl@ntNet returns, and can lack
      // species-level data entirely — both confirmed live:
      // - "Prayerplant" (Maranta leuconeura) has zero Perenual matches, filtered or not, even
      //   though Perenual's own common_name for the same species is "prayer plant" — a spacing
      //   mismatch, not a missing species. The scientific name sidesteps it.
      // - "Pachira glabra" (a Money Tree candidate) and "Rhaphidophora tetrasperma" (Mini Monstera)
      //   have zero Perenual matches under ANY name, common or scientific — Perenual simply
      //   doesn't carry those species at all, even though it does carry other species in the same
      //   genus (e.g. "Pachira aquatica"). Only the genus can find anything in that case.
      // Try progressively broader/more standardized names in order, stopping at the first one
      // that resolves. A genus-level match trades precision (it may show a real but different
      // species within the same genus) for not showing a bare failure when Perenual's coverage
      // gap is total — every tier still only ever uses real Perenual data, never invented.
      const nameTiers = [...new Set([commonName, scientificName, genusName].filter((name): name is string => Boolean(name)))];

      let result: SpeciesLookupResult = { reason: 'no-perenual-match', success: false };
      for (const [tierIndex, name] of nameTiers.entries()) {
        result = await lookupSpeciesByName(name, image);
        if (result.success || result.reason !== 'no-perenual-match') break;

        // lookupSpeciesByName logs the miss, but it is also called straight from Library search
        // where there is no next tier, so it cannot say whether anything follows. Saying so here
        // is what makes a routine fallback read as a fallback rather than a failure.
        const nextName = nameTiers[tierIndex + 1];
        if (nextName) {
          console.warn(`identifyAndResolveSpecies: no Perenual match for "${name}" — retrying with "${nextName}"`);
        }
      }

      return result;
    },
    [lookupSpeciesByName],
  );

  /**
   * The single way owned plants are written.
   *
   * `ownedPlantsRef` is the write-path source of truth: `saveDetection` and `renameOwnedPlant`
   * must validate against the very latest list and return a duplicate-name result synchronously,
   * which reading React state cannot guarantee between two saves in the same tick. `ownedPlants`
   * state is the render path.
   *
   * They cannot diverge because every write goes through here, updating both in one step. What
   * they used to do instead was assign `ownedPlantsRef.current` from *inside* a `setOwnedPlants`
   * updater — a side effect in a function React may invoke twice under StrictMode and whose render
   * it may discard, leaving the ref describing a list that was never committed.
   */
  const commitOwnedPlants = React.useCallback((nextPlants: OwnedPlant[]) => {
    ownedPlantsRef.current = nextPlants;
    setOwnedPlants(nextPlants);
  }, []);

  const getOwnedPlantById = React.useCallback(
    (ownedPlantId: string | undefined) =>
      ownedPlants.find(plant => plant.ownedPlantId === ownedPlantId),
    [ownedPlants],
  );

  const deleteOwnedPlant = React.useCallback((ownedPlantId: string) => {
    commitOwnedPlants(ownedPlantsRef.current.filter(plant => plant.ownedPlantId !== ownedPlantId));
  }, [commitOwnedPlants]);

  const saveDetection = React.useCallback(
    (detectionId: string, customName: string): PlantNameSaveResult => {
      const detection = detections.find(item => item.detectionId === detectionId);
      const species = getSpeciesById(detection?.speciesId);
      const nextName = customName.trim();

      if (!detection || !species || nextName.length === 0) {
        return {
          duplicate: true,
          message: 'Plant could not be saved. Try taking another photo.',
        };
      }

      const currentPlants = ownedPlantsRef.current;

      if (findDuplicateName(nextName, currentPlants)) {
        return {
          duplicate: true,
          message: buildDuplicateNameMessage(nextName),
        };
      }

      const ownedPlantId = `owned-plant-${ownedPlantIndexRef.current}`;
      ownedPlantIndexRef.current += 1;
      const nextPlants = [
        ...currentPlants,
        {
          addedAt: new Date().toISOString(),
          customName: nextName,
          image: detection.image,
          ownedPlantId,
          speciesId: species.speciesId,
          wateringHistory: [],
        },
      ];
      commitOwnedPlants(nextPlants);

      return {
        duplicate: false,
        ownedPlantId,
      };
    },
    [commitOwnedPlants, detections, getSpeciesById],
  );

  const markWatered = React.useCallback((ownedPlantId: string) => {
    commitOwnedPlants(
      ownedPlantsRef.current.map(plant =>
        plant.ownedPlantId === ownedPlantId
          ? { ...plant, wateringHistory: [...plant.wateringHistory, new Date().toISOString()] }
          : plant,
      ),
    );
  }, [commitOwnedPlants]);

  const unmarkWatered = React.useCallback((ownedPlantId: string) => {
    commitOwnedPlants(
      ownedPlantsRef.current.map(plant =>
        plant.ownedPlantId === ownedPlantId
          ? { ...plant, wateringHistory: plant.wateringHistory.slice(0, -1) }
          : plant,
      ),
    );
  }, [commitOwnedPlants]);

  const addSearchHistoryEntry = React.useCallback((species: PlantSpecies) => {
    setSearchHistory(current =>
      pushRecentItem(current, species, item => item.speciesId),
    );
  }, []);

  const renameOwnedPlant = React.useCallback(
    (ownedPlantId: string, customName: string): PlantNameSaveResult => {
      const nextName = customName.trim();
      const currentPlants = ownedPlantsRef.current;

      if (findDuplicateName(nextName, currentPlants, ownedPlantId)) {
        return {
          duplicate: true,
          message: buildDuplicateNameMessage(nextName),
        };
      }

      commitOwnedPlants(
        currentPlants.map(plant =>
          plant.ownedPlantId === ownedPlantId ? { ...plant, customName: nextName } : plant,
        ),
      );

      return { duplicate: false, ownedPlantId };
    },
    [commitOwnedPlants],
  );

  // Restore once on mount, then save on every change. The two effects are ordered by the
  // `hasHydratedRef` guard rather than by hook order, because the read is async and would
  // otherwise lose the race against the first save.
  React.useEffect(() => {
    let cancelled = false;

    loadOwnedPlants()
      .then(stored => {
        if (cancelled || !stored) return;
        // Through the same write path as every other change, so state and ref cannot diverge —
        // this is the one write that runs asynchronously, which makes it the worst one to
        // special-case.
        commitOwnedPlants(stored);
        ownedPlantIndexRef.current = getNextOwnedPlantIndex(stored);
      })
      .finally(() => {
        if (!cancelled) hasHydratedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [commitOwnedPlants]);

  React.useEffect(() => {
    if (!hasHydratedRef.current) return;
    saveOwnedPlants(ownedPlants);
  }, [ownedPlants]);

  // Searched plants written up in earlier sessions; the merge and its save are speciesCache's.
  React.useEffect(() => {
    let cancelled = false;

    speciesCache.hydrate().then(restoredAny => {
      if (!cancelled && restoredAny) setSpeciesCacheVersion(version => version + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [speciesCache]);

  const value = React.useMemo<PlantDataContextValue>(
    () => ({
      addSearchHistoryEntry,
      createDetection,
      deleteOwnedPlant,
      detections,
      getDetectionById: getDetectionByIdFromState,
      getOwnedPlantById,
      getSpeciesById,
      identifyAndResolveSpecies,
      lookupSpeciesByName,
      markSpeciesOpened,
      markWatered,
      ownedPlants,
      renameOwnedPlant,
      resolveDetectionSpecies,
      resolveSpeciesById,
      saveDetection,
      searchHistory,
      unmarkWatered,
    }),
    [
      addSearchHistoryEntry,
      createDetection,
      deleteOwnedPlant,
      detections,
      getDetectionByIdFromState,
      getOwnedPlantById,
      getSpeciesById,
      identifyAndResolveSpecies,
      lookupSpeciesByName,
      markSpeciesOpened,
      markWatered,
      ownedPlants,
      renameOwnedPlant,
      resolveDetectionSpecies,
      resolveSpeciesById,
      saveDetection,
      searchHistory,
      unmarkWatered,
    ],
  );

  return (
    <PlantDataContext.Provider value={value}>
      {children}
    </PlantDataContext.Provider>
  );
}

export function usePlantData() {
  const value = React.useContext(PlantDataContext);
  if (!value) throw new Error('usePlantData must be used inside PlantDataProvider');
  return value;
}
