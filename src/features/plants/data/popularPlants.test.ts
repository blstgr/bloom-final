import { POPULAR_CATALOG_SPECIES, POPULAR_PLANT_PHOTO_CREDITS } from './popularPlants';

describe('popular plants catalog', () => {
  it('gives every plant its own photo', () => {
    const urls = POPULAR_CATALOG_SPECIES.map(species => species.detailImageUrl);

    expect(new Set(urls).size).toBe(urls.length);
  });

  it('credits the photographer of every photo', () => {
    POPULAR_CATALOG_SPECIES.forEach(species => {
      expect(POPULAR_PLANT_PHOTO_CREDITS[species.speciesId]).toBeDefined();
    });
  });
});
