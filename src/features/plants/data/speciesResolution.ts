/**
 * Resolving a species: everything between "we have a Perenual id or a name" and "we have a
 * PlantSpecies the UI can render".
 *
 * This lived in PlantDataProvider, which meant that file changed for four unrelated reasons --
 * owned-plant CRUD, the detection log, Library hand-off state, and this pipeline. A Perenual or
 * Unsplash change and a watering change landed in the same 721-line file. It also made these
 * pure async functions testable only through a rendered provider: PlantDataProvider.test.tsx
 * mounted a React tree and mocked four service modules to exercise orchestration with no UI in it.
 *
 * Nothing here touches React. The provider binds it to state; this decides what a species is.
 */

import type { ImageSourcePropType } from 'react-native';

import { resolveCareFacts } from '../../../services/careDerivation';
import { PERENUAL_UPGRADE_PLACEHOLDER_MARKER } from '../../../services/constants';
import { getSpeciesDetails, PlantApiError } from '../../../services/plantApi';
import { generateSpeciesCopy, PlantCopyApiError } from '../../../services/plantCopyApi';
import { PlantIdApiError } from '../../../services/plantIdApi';
import type {
  GeneratedSpeciesCopy,
  PerenualSpeciesDetails,
  ResolvedCareFacts,
} from '../../../services/types';
import { GENERIC_QUERY_WORDS, searchPhoto } from '../../../services/unsplashApi';

import { noPlantPhoto } from './noPlantPhoto';
import { buildFallbackSpeciesDetails } from './speciesDetailsFallback';
import { toDisplaySpeciesName } from './speciesName';
import type { PlantSpecies } from './types';

/** True when a caller supplied a usable name, so the blocked species/details call can be skipped
 * (see speciesDetailsFallback.ts). */
export function hasKnownName(knownName: string | undefined): knownName is string {
  return typeof knownName === 'string' && knownName.trim().length > 0;
}

/** Why a species lookup failed, in terms the UI can act on rather than HTTP terms. */
export type SpeciesLookupFailureReason =
  /** The API key/IP itself was rejected (e.g. an IP-allowlist mismatch) — distinct from every
   * other reason because it has nothing to do with the photo or a bad match, unlike the others. */
  | 'access-denied'
  | 'low-confidence'
  | 'network-error'
  | 'no-candidates'
  | 'no-perenual-match'
  | 'rate-limited';

const SCIENTIFIC_NAME_INDEX = 0;
const GENUS_TOKEN_INDEX = 0;
const SPECIES_EPITHET_TOKEN_INDEX = 1;
const MIN_STRIPPABLE_WORD_COUNT = 2;
const NO_PHOTO_ACKNOWLEDGMENT = "We couldn't reliably find what this one looks like, but here's what we know:\n\n";

/** A real photo, never Perenual's own "upgrade to see this image" upsell graphic. */
function getRealPerenualImageUrl(details: PerenualSpeciesDetails): string | null {
  const url = details.default_image?.original_url ?? details.default_image?.medium_url ?? null;
  if (!url || url.includes(PERENUAL_UPGRADE_PLACEHOLDER_MARKER)) return null;
  return url;
}

/** "Acer palmatum 'Gwen's Rose Delight'" -> "Acer palmatum" — genus + species epithet, dropping
 * any cultivar/variety suffix, which is usually much better indexed by a photo search. */
function parseGenusAndSpeciesEpithet(scientificName: string[]): string | null {
  const first = scientificName[SCIENTIFIC_NAME_INDEX];
  if (!first) return null;

  const words = first.trim().split(/\s+/);
  const genus = words[GENUS_TOKEN_INDEX];
  const speciesEpithet = words[SPECIES_EPITHET_TOKEN_INDEX];
  if (!genus || !speciesEpithet) return null;

  return `${genus} ${speciesEpithet}`;
}

/** "Maranta leuconeura 'Fascinator'" -> "Maranta" — the genus alone. Confirmed live that this is
 * the single best photo query available: Unsplash returns 49 genuine results for "maranta" but
 * only 1 for "Maranta leuconeura", while the common name "prayer plant" returns birthday cards,
 * a mosque and a praying statue. Botanical names do not collide with unrelated subjects; common
 * names are ordinary English words that do. */
function parseGenus(scientificName: string[]): string | null {
  const first = scientificName[SCIENTIFIC_NAME_INDEX];
  if (!first) return null;

  return first.trim().split(/\s+/)[GENUS_TOKEN_INDEX] ?? null;
}

/** "Shirazz Japanese Maple" -> "Japanese Maple" — drops a leading cultivar-style modifier so a
 * generic version of the plant can still be found even when the exact cultivar can't. Returns
 * null when what remains is a single generic word ("Prayer Plant" -> "Plant"), which would match
 * essentially any photo. */
function stripLeadingWord(name: string): string | null {
  const words = name.trim().split(/\s+/);
  if (words.length < MIN_STRIPPABLE_WORD_COUNT) return null;

  const remainder = words.slice(1).join(' ');
  const isGenericRemainder = words.slice(1).every(word => GENERIC_QUERY_WORDS.has(word.toLowerCase()));
  return isGenericRemainder ? null : remainder;
}

/**
 * Tiered photo search. The BOTANICAL name is tried before the common name, always, whatever the
 * user typed: a search for "prayer plant" must go out as "Maranta". Common names are ordinary
 * English words that collide with unrelated photos (confirmed: "prayer plant" returns a praying
 * statue, birthday cards and a mosque), while botanical names collide with nothing. Order: a real
 * (non-placeholder) Perenual photo, genus + species epithet, genus alone, then the common name
 * and a genus-level common-name fallback as last resorts.
 * Returns null (not an error) when nothing usable was found at any tier — callers fall back to
 * either the user's own captured photo (if this came from a photo-identify flow) or a generic
 * "no photo available" asset.
 */
/** Every API failure that reaches the UI funnels through here. The four services raise four
 * different error types with overlapping `kind` unions (Perenual says 'rate-limited', Pl@ntNet
 * says 'quota-exceeded' for the same thing), and this mapping was previously written out in three
 * separate catch blocks — so adding a reason, or a fifth service, meant finding all three. */
export function toLookupFailureReason(error: unknown): SpeciesLookupFailureReason {
  if (error instanceof PlantApiError) {
    if (error.kind === 'rate-limited') return 'rate-limited';
    if (error.kind === 'forbidden') return 'access-denied';
  }
  if (error instanceof PlantIdApiError) {
    if (error.kind === 'quota-exceeded') return 'rate-limited';
    if (error.kind === 'forbidden') return 'access-denied';
  }
  if (error instanceof PlantCopyApiError && error.kind === 'forbidden') return 'access-denied';
  return 'network-error';
}

export async function findSpeciesPhotoUrl(details: PerenualSpeciesDetails): Promise<string | null> {
  const realPerenualUrl = getRealPerenualImageUrl(details);
  if (realPerenualUrl) return realPerenualUrl;

  const scientificQuery = parseGenusAndSpeciesEpithet(details.scientific_name);
  const scientificMatch = scientificQuery ? await searchPhoto(scientificQuery) : null;
  if (scientificMatch) return scientificMatch;

  const genusQuery = parseGenus(details.scientific_name);
  const genusMatch = genusQuery ? await searchPhoto(genusQuery) : null;
  if (genusMatch) return genusMatch;

  const commonMatch = await searchPhoto(details.common_name);
  if (commonMatch) return commonMatch;

  const genericQuery = stripLeadingWord(details.common_name);
  return genericQuery ? searchPhoto(genericQuery) : null;
}

export type ResolvedSpeciesCore = {
  commonName: string;
  generated: GeneratedSpeciesCopy;
  photoUrl: string | null;
  resolvedFacts: ResolvedCareFacts;
};

/** The part of species resolution that's identical no matter who asks for it — safe to share
 * across concurrent callers (cache/in-flight dedup) because it never depends on a caller-specific
 * fallback image. Perenual details, derived care facts, the tiered photo search, and the
 * generated copy all live here.
 *
 * `knownName` drives whether the live `species/details` call is even attempted — see the skip
 * below and speciesDetailsFallback.ts for why that's a real, ongoing failure (not hypothetical)
 * on this app's current API plan, and why every other call here still hits the real API. */
export async function resolveSpeciesCore(perenualId: number, knownName?: string): Promise<ResolvedSpeciesCore> {
  let details: PerenualSpeciesDetails;
  if (hasKnownName(knownName)) {
    // Confirmed permanently blocked on this app's free-tier Perenual plan: species/details/{id}
    // returns 403 "Please Upgrade Plan" every time, not a quota that resets (see
    // memory/project_intentional_decisions.md). Before this change, every resolution still made
    // this call and waited for the guaranteed failure before falling back — a full wasted network
    // round-trip on every single plant. Whenever a name is already known (a search result or an
    // accepted Pl@ntNet identification), skip the live call entirely and go straight to the
    // synthesized fallback: no loss of accuracy, since this call was never returning real data on
    // this plan anyway. getSpeciesDetails/fetchPerenual are untouched in plantApi.ts — still
    // exercised below whenever no name is known yet, and kept in place because the assignment is
    // to demonstrate real API usage. Trivially reversible: delete this branch (and always call
    // getSpeciesDetails) once the Perenual plan is upgraded.
    details = buildFallbackSpeciesDetails(perenualId, knownName);
  } else {
    details = await getSpeciesDetails(perenualId);
  }

  const resolvedFacts = resolveCareFacts(details);
  // Run independently rather than sequentially — copy generation never needed the photo result,
  // it only used to (needlessly) wait on it. This is what lets the slower of the two (usually
  // DeepSeek) set the total wait instead of the sum of both.
  const [photoUrl, generated] = await Promise.all([
    findSpeciesPhotoUrl(details),
    generateSpeciesCopy(resolvedFacts, details),
  ]);

  return { commonName: toDisplaySpeciesName(details.common_name), generated, photoUrl, resolvedFacts };
}

/** The species as written up, with no caller's fallback image and no display wording: what the
 * species cache holds and stores on the device. A plant with no real photo carries the generic
 * no-photo asset and an empty `detailImageUrl`; presentSpecies decides what that means on screen. */
export function toStoredSpecies(perenualId: number, core: ResolvedSpeciesCore): PlantSpecies {
  const { commonName, generated, photoUrl, resolvedFacts } = core;
  const imageSource: ImageSourcePropType = photoUrl ? { uri: photoUrl } : noPlantPhoto;

  return {
    category: generated.category,
    description: generated.description,
    detailImage: imageSource,
    detailImageUrl: photoUrl ?? '',
    image: imageSource,
    isToxicToPets: resolvedFacts.isToxicToPets,
    lightNeed: resolvedFacts.lightNeed,
    speciesId: String(perenualId),
    speciesName: commonName,
    wateringIntervalDays: resolvedFacts.wateringIntervalDays,
    wikiArticle: generated.wikiArticle,
  };
}

/** The caller-specific part: cheap, synchronous, never shared, and the one place the no-photo rule
 * lives. `fallbackImage` (the user's own captured photo, when resolution started from a
 * photo-identify flow) is preferred over the generic no-photo asset if the species has no real
 * photo — applied fresh per caller so one caller's fallback image can never leak into another
 * concurrent caller's result for the same species. A plant shown with no photo at all says so
 * ahead of its copy. Returns the species itself when there is nothing to change. */
export function presentSpecies(species: PlantSpecies, fallbackImage?: ImageSourcePropType): PlantSpecies {
  if (species.detailImageUrl) return species;

  if (fallbackImage) return { ...species, detailImage: fallbackImage, image: fallbackImage };

  return {
    ...species,
    description: `${NO_PHOTO_ACKNOWLEDGMENT}${species.description}`,
    wikiArticle: species.wikiArticle === undefined ? undefined : `${NO_PHOTO_ACKNOWLEDGMENT}${species.wikiArticle}`,
  };
}

/** A freshly resolved core, ready for this caller's screen. */
export function assemblePlantSpecies(
  perenualId: number,
  core: ResolvedSpeciesCore,
  fallbackImage?: ImageSourcePropType,
): PlantSpecies {
  return presentSpecies(toStoredSpecies(perenualId, core), fallbackImage);
}
