import {
  buildPlantSchedule,
  isWateringDue,
  isWateringTooSoon,
} from '../src/features/plants/data/schedule';
import type { OwnedPlant, PlantSpecies } from '../src/features/plants/data/types';

const TEST_SPECIES: PlantSpecies = {
  category: 'Test',
  description: 'Test plant',
  detailImage: 1,
  detailImageUrl: 'https://example.com/detail.jpg',
  image: 1,
  isToxicToPets: false,
  lightNeed: 'bright',
  speciesId: 'test-species',
  speciesName: 'Test species',
  wateringIntervalDays: 10,
};

function createOwnedPlant(overrides: Partial<OwnedPlant>): OwnedPlant {
  return {
    addedAt: '2026-07-05T12:00:00.000Z',
    customName: 'Test plant',
    image: TEST_SPECIES.image,
    ownedPlantId: 'owned-test',
    speciesId: TEST_SPECIES.speciesId,
    wateringHistory: [],
    ...overrides,
  };
}

describe('watering schedule due state', () => {
  it('treats an unwatered plant added today as due for today regardless of time', () => {
    const ownedPlant = createOwnedPlant({});

    expect(isWateringDue(ownedPlant, TEST_SPECIES, new Date('2026-07-05T12:00:00.000Z'))).toBe(true);
  });

  it('does not mark an unwatered future plant as due', () => {
    const ownedPlant = createOwnedPlant({
      addedAt: '2026-07-06T00:00:00.000Z',
    });

    expect(isWateringDue(ownedPlant, TEST_SPECIES, new Date('2026-07-05T12:00:00.000Z'))).toBe(false);
  });

  it('marks plants due when the next watering date is today or in the past', () => {
    const ownedPlant = createOwnedPlant({
      wateringHistory: ['2026-06-25T12:00:00.000Z'],
    });

    expect(isWateringDue(ownedPlant, TEST_SPECIES, new Date('2026-07-05T12:00:00.000Z'))).toBe(true);
  });

  it('does not mark a plant watered today as due', () => {
    const ownedPlant = createOwnedPlant({
      wateringHistory: ['2026-07-05T08:00:00.000Z'],
    });

    expect(isWateringDue(ownedPlant, TEST_SPECIES, new Date('2026-07-05T23:00:00.000Z'))).toBe(false);
  });

  it('uses calendar days for too-soon checks so due plants are not blocked near midnight', () => {
    const oneDaySpecies = { ...TEST_SPECIES, wateringIntervalDays: 1 };
    const ownedPlant = createOwnedPlant({
      wateringHistory: ['2026-07-04T23:50:00.000'],
    });
    const now = new Date('2026-07-05T00:05:00.000');

    expect(isWateringDue(ownedPlant, oneDaySpecies, now)).toBe(true);
    expect(isWateringTooSoon(ownedPlant, oneDaySpecies, now)).toBe(false);
  });
});

describe('the interval override', () => {
  // The weather feature adds an optional intervalDays to these functions. Everything that does
  // not pass one must behave exactly as it did before that parameter existed, because the
  // feature is a switch the user can turn off.
  const now = new Date('2026-07-05T12:00:00.000Z');
  const ownedPlant = createOwnedPlant({ wateringHistory: ['2026-07-01T09:00:00.000Z'] });

  it('is identical to the species interval when omitted', () => {
    expect(isWateringDue(ownedPlant, TEST_SPECIES, now)).toBe(
      isWateringDue(ownedPlant, TEST_SPECIES, now, TEST_SPECIES.wateringIntervalDays),
    );
    expect(isWateringTooSoon(ownedPlant, TEST_SPECIES, now)).toBe(
      isWateringTooSoon(ownedPlant, TEST_SPECIES, now, TEST_SPECIES.wateringIntervalDays),
    );
    expect(buildPlantSchedule(ownedPlant, TEST_SPECIES)).toEqual(
      buildPlantSchedule(ownedPlant, TEST_SPECIES, undefined, TEST_SPECIES.wateringIntervalDays),
    );
  });

  it('shortens the wait when a drier forecast passes a smaller interval', () => {
    // Not yet due on the species' own interval, due once the weather shortens it.
    expect(isWateringDue(ownedPlant, TEST_SPECIES, now)).toBe(false);
    expect(isWateringDue(ownedPlant, TEST_SPECIES, now, 3)).toBe(true);
  });

  it('drives the generated schedule dates, not just the due check', () => {
    const [, second] = buildPlantSchedule(ownedPlant, TEST_SPECIES, 2, 3);

    // Three days after the last watering, not the species' own interval.
    expect(second.day).toBe('4');
  });
});
