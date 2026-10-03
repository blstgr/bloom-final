import { catalogSpecies } from './catalog';
import { SEED_PLANT_PHOTO_CREDITS } from './mockPlants';

// A hotlinked photo is named by its URL; a bundled one by its source (a module id in the app, a
// file path under Jest).
function photoKey(image: (typeof catalogSpecies)[number]['image']) {
  return typeof image === 'object' && image != null && 'uri' in image ? image.uri : JSON.stringify(image);
}

describe('species catalog', () => {
  it('gives every species its own photo, so no grid shows the same picture twice', () => {
    const photos = catalogSpecies.map(species => photoKey(species.image));

    expect(new Set(photos).size).toBe(photos.length);
  });

  it('credits the photographer of every hotlinked seed photo', () => {
    Object.entries(SEED_PLANT_PHOTO_CREDITS).forEach(([speciesId, credit]) => {
      const species = catalogSpecies.find(entry => entry.speciesId === speciesId);

      expect(species && photoKey(species.image)).toContain('images.unsplash.com');
      expect(credit.photographer).not.toBe('');
    });
  });
});
