import {
  hardinessZoneFromMinimums,
  NO_LOCATION_PLANT_COUNT,
  rankPopularPlants,
  winterDaylightHours,
} from './popularPlantRanking';
import { POPULAR_PLANTS } from './popularPlants';

const KYIV = { annualMinimumsC: [-22.8, -14.9, -16.1], humidityMean: 72, latitude: 50.45 };
const DELHI = { annualMinimumsC: [3.2, 4.1, 2.8], humidityMean: 58, latitude: 28.61 };
const SINGAPORE = { annualMinimumsC: [22.1, 22.6, 22.3], humidityMean: 83, latitude: 1.35 };

function rankOf(speciesId: string, climate: typeof KYIV) {
  return rankPopularPlants(climate).findIndex(plant => plant.speciesId === speciesId);
}

describe('winterDaylightHours', () => {
  it('is twelve hours at the equator', () => {
    expect(winterDaylightHours(0)).toBeCloseTo(12, 0);
  });

  it('shortens towards the poles in either hemisphere', () => {
    expect(winterDaylightHours(50.45)).toBeCloseTo(8.1, 0);
    expect(winterDaylightHours(-50.45)).toBeCloseTo(8.1, 0);
  });

  it('clamps to polar night', () => {
    expect(winterDaylightHours(80)).toBe(0);
  });
});

describe('hardinessZoneFromMinimums', () => {
  it('maps the mean coldest night to a USDA zone', () => {
    expect(hardinessZoneFromMinimums([-18, -18, -18])).toBe(6);
    expect(hardinessZoneFromMinimums([5, 5, 5])).toBe(11);
  });

  it('clamps to the scale', () => {
    expect(hardinessZoneFromMinimums([-60])).toBe(1);
    expect(hardinessZoneFromMinimums([30])).toBe(13);
  });
});

describe('rankPopularPlants', () => {
  it('without a climate, shows the top ten by popularity', () => {
    const ranked = rankPopularPlants(null);

    expect(ranked).toHaveLength(NO_LOCATION_PLANT_COUNT);
    expect(ranked.map(plant => plant.popularityRank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('with a climate, ranks the whole catalog', () => {
    expect(rankPopularPlants(KYIV)).toHaveLength(POPULAR_PLANTS.length);
  });

  it('promotes low-light plants where winter days are short', () => {
    // Snake plant copes with a dim room; aloe needs sun.
    expect(rankOf('snake-plant', KYIV)).toBeLessThan(rankOf('aloe-vera', KYIV));
    expect(rankOf('aloe-vera', KYIV)).toBeGreaterThan(rankOf('aloe-vera', DELHI));
  });

  it('demotes humidity lovers where indoor air is dry', () => {
    expect(rankOf('boston-fern', KYIV)).toBeGreaterThan(rankOf('boston-fern', SINGAPORE));
  });
});
