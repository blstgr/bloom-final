/**
 * Plant search: the curated seed species, Perenual, and the ranking that decides what a match is.
 *
 * This lives beside the other plant data rather than in LibraryScreen for two reasons: the
 * ranking is domain knowledge about Perenual's index, not screen layout; and the screen used to
 * call `plantApi.searchSpecies` directly, opening a second seam onto a dependency the provider
 * already wraps. `rankByRelevance` is exported for its own tests -- the screen previously had to
 * export it, and a private rank constant, purely so a test could reach them.
 */
import { searchSpecies } from '../../../services/plantApi';
import type { PerenualSpeciesListItem } from '../../../services/types';

import { catalogSpecies } from './catalog';
import { toDisplaySpeciesName } from './speciesName';

const MAX_RESULTS = 8;
// Perenual answers in roughly 1-3s and the figure moves hour to hour, so repeating a query the
// user already ran (typing, clearing, retyping) should cost nothing.
const MAX_CACHED_QUERIES = 32;
const RANK_STARTS_WITH = 0;
const RANK_WORD_BOUNDARY = 1;
const RANK_SCIENTIFIC_NAME_MATCH = 2;

/** Scientific names carry punctuation ("Maranta leuconeura 'Erythroneura'") that a plain word
 * split leaves attached ("'erythroneura'") — strip anything that isn't a letter from each token's
 * edges before comparing. */
function getScientificNameTokens(scientificName: string[]): string[] {
  return scientificName
    .flatMap(name => name.toLowerCase().split(/\s+/))
    .map(token => token.replace(/^[^a-z]+|[^a-z]+$/g, ''))
    .filter(token => token.length > 0);
}

/**
 * Perenual's own search ranking is a poor fit for search-as-you-type: it matches substrings
 * across every field (scientific name, family, etc), not just the displayed common name, so a
 * query like "pa" comes back with real matches ("Paperbark Maple") mixed in with names that only
 * coincidentally contain the query mid-word ("Japanese Maple" via "ja-PA-nese"), with no
 * relevance signal distinguishing them. Rank what we did get — starts-with (common name) first,
 * then a word-boundary match (a new word in the common name starts with the query), then an exact
 * whole-word match against a scientific-name token (so searching a genus like "Maranta" still
 * finds species whose common name is something unrelated-looking like "prayer plant") — and drop
 * plain no-boundary substring matches entirely (e.g. "palm" merely prefixing "palmatum", not
 * equal to it), rather than pad the list with weak, coincidental hits.
 */
/** Rank a display name against the query: a prefix beats a new word starting mid-name, and
 * anything else is not a match. Shared so "what counts as a word boundary" is defined once for
 * both the seed species and Perenual's results. */
function rankByName(name: string, normalizedQuery: string): number | null {
  const normalizedName = name.toLowerCase();
  if (normalizedName.startsWith(normalizedQuery)) return RANK_STARTS_WITH;
  if (normalizedName.includes(` ${normalizedQuery}`)) return RANK_WORD_BOUNDARY;

  return null;
}

export function rankByRelevance(item: PerenualSpeciesListItem, normalizedQuery: string): number | null {
  const nameRank = rankByName(item.common_name, normalizedQuery);
  if (nameRank !== null) return nameRank;

  // Match each typed word against the scientific-name tokens individually, not the whole query
  // as one token — otherwise a genus+species query ("Hoya carnosa") could never match, since no
  // single token ever equals a multi-word string.
  const scientificNameTokens = getScientificNameTokens(item.scientific_name);
  const queryTokens = normalizedQuery.split(/\s+/).filter(token => token.length > 0);
  if (queryTokens.every(token => scientificNameTokens.includes(token))) return RANK_SCIENTIFIC_NAME_MATCH;

  return null;
}

/**
 * One row in the search list, from either source.
 *
 * `speciesId` spans two namespaces: a seed slug for a curated species, a stringified Perenual id
 * for a remote one. `SpeciesInfoScreen` resolves both -- it tries `getSpeciesById` first, so a
 * seed row opens without touching the network at all.
 */
export type SpeciesSearchResult = {
  speciesId: string;
  speciesName: string;
};

/**
 * The seed species this app ships, matched locally.
 *
 * Returns synchronously and costs no request, so a query the curated set covers ("zz", "monstera")
 * fills the list the moment typing stops instead of after Perenual's round trip. These ids are
 * seed slugs rather than Perenual numbers, which `SpeciesInfoScreen` resolves through
 * `getSpeciesById` before it ever reaches the network -- so opening one is instant too.
 */
export function searchSeedSpecies(query: string): SpeciesSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return catalogSpecies
    .map(species => {
      const rank = rankByName(species.speciesName, normalizedQuery);

      return rank === null ? null : { rank, species };
    })
    .filter((entry): entry is { rank: number; species: (typeof catalogSpecies)[number] } => entry !== null)
    .sort((a, b) => a.rank - b.rank)
    .map(entry => ({ speciesId: entry.species.speciesId, speciesName: entry.species.speciesName }))
    .slice(0, MAX_RESULTS);
}

const resultCache = new Map<string, SpeciesSearchResult[]>();

/** Empties the query cache. Exists so tests can assert caching behaviour without one test's
 * warm entry deciding the next one's result. */
export function clearSpeciesSearchCache() {
  resultCache.clear();
}

function writeCache(query: string, results: SpeciesSearchResult[]) {
  // Plain insertion-order eviction: the oldest query goes when the cache is full. Map preserves
  // insertion order, so the first key is the oldest.
  if (resultCache.size >= MAX_CACHED_QUERIES) {
    const oldestQuery = resultCache.keys().next().value;
    if (oldestQuery !== undefined) resultCache.delete(oldestQuery);
  }
  resultCache.set(query, results);
}

/**
 * Search Perenual and return only the results relevant to the query, closest first.
 *
 * Normalizes the query itself rather than trusting the caller: `rankByRelevance` assumes a
 * lowercased, trimmed string, and the cache key has to agree with it or two spellings of the
 * same search would each pay their own round trip.
 */
export async function searchSpeciesByRelevance(query: string): Promise<SpeciesSearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const cached = resultCache.get(normalizedQuery);
  if (cached) return cached;

  const items = await searchSpecies(normalizedQuery);
  const results = items
    .map(item => ({ item, rank: rankByRelevance(item, normalizedQuery) }))
    .filter((entry): entry is { item: PerenualSpeciesListItem; rank: number } => entry.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .map(entry => ({ speciesId: String(entry.item.id), speciesName: toDisplaySpeciesName(entry.item.common_name) }))
    .slice(0, MAX_RESULTS);

  writeCache(normalizedQuery, results);

  return results;
}

/**
 * Seed matches first, then each Perenual result whose name is not already in the list.
 *
 * Deduplicating on name rather than id is deliberate: the same plant carries a seed slug locally
 * and a Perenual number remotely, so ids can never match even when the rows are the same plant.
 */
export function mergeSearchResults(
  seedResults: SpeciesSearchResult[],
  remoteResults: SpeciesSearchResult[],
): SpeciesSearchResult[] {
  const seenNames = new Set(seedResults.map(result => result.speciesName.toLowerCase()));
  // Remote against remote too: Perenual lists several species under one common name ("Zebra
  // plant" twice), and two identical rows read as a bug. The first, most relevant, one stays.
  const uniqueRemote = remoteResults.filter(result => {
    const name = result.speciesName.toLowerCase();
    if (seenNames.has(name)) return false;
    seenNames.add(name);

    return true;
  });

  return [...seedResults, ...uniqueRemote].slice(0, MAX_RESULTS);
}
