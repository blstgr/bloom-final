import { CATALOG_ARTICLES } from './catalogArticles';
import { mockSpecies } from './mockPlants';
import { POPULAR_CATALOG_SPECIES } from './popularPlants';
import type { PlantSpecies } from './types';

/**
 * Every species the app ships with: the seed set plus the popular-plants catalog. Both are
 * complete locally, so anything in here opens without a network request — `SpeciesInfoScreen`
 * checks this before ever reaching Perenual.
 */
export const catalogSpecies: PlantSpecies[] = [...mockSpecies, ...POPULAR_CATALOG_SPECIES].map(species => ({
  ...species,
  wikiArticle: CATALOG_ARTICLES[species.speciesId],
}));

export function getSpeciesById(speciesId: string | undefined) {
  return catalogSpecies.find(species => species.speciesId === speciesId);
}
