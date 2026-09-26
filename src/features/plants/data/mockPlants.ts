import { buildPlantDescription } from './plantDescription';
import type { OwnedPlant, PlantSpecies } from './types';


const marbleQueenPothos = require('../../../assets/images/marble-queen-pothos.jpg');
const moneyTree = require('../../../assets/images/money-tree.jpg');
// Temporary Monstera 3 owned-plant photo for the mock dataset. Replace with a final licensed
// release asset before shipping the production seed data.
const temporaryMonsteraThree = require('../../../assets/images/monstera-3-temporary.jpg');
const monsteraSunset = require('../../../assets/images/monstera-deliciosa-sunset.jpg');
const monsteraFull = require('../../../assets/images/monstera-deliciosa.jpg');
const parlorPalm = require('../../../assets/images/parlor-palm.jpg');
const prayerPlant = require('../../../assets/images/prayer-plant.jpg');
const rubberPlant = require('../../../assets/images/rubber-plant.jpg');
const variegatedPeperomia = require('../../../assets/images/variegated-peperomia.jpg');
const zzPlant = require('../../../assets/images/zz-plant.jpg');

const WATERING_INTERVAL_DAYS = 14;
const DETAIL_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900',
  'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?w=900',
  'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=900',
  'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=900',
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=900',
  'https://images.unsplash.com/photo-1453904300235-0f2f60b15b5d?w=900',
];

export const mockSpecies: PlantSpecies[] = [
  {
    category: 'Independent Roommate',
    description: buildPlantDescription({
      careNote: 'tolerates low light and mild neglect',
      light: 'bright indirect light',
      potSizeCm: '2-4',
      repotYears: '2-3',
      wateringIntervalDays: WATERING_INTERVAL_DAYS,
    }),
    detailImage: zzPlant,
    detailImageUrl: DETAIL_IMAGE_URLS[1],
    image: zzPlant,
    isToxicToPets: true,
    lightNeed: 'bright',
    speciesId: 'zz-plant',
    speciesName: 'ZZ plant',
    wateringIntervalDays: WATERING_INTERVAL_DAYS,
  },
  {
    category: 'High-Maintenance Diva',
    description: buildPlantDescription({
      careNote: 'needs steady warmth to avoid sulking',
      light: 'bright indirect light',
      potSizeCm: '4-6',
      repotYears: '2',
      wateringIntervalDays: 10,
    }),
    detailImage: monsteraSunset,
    detailImageUrl: DETAIL_IMAGE_URLS[0],
    image: monsteraFull,
    isToxicToPets: true,
    lightNeed: 'bright',
    speciesId: 'monstera-deliciosa',
    speciesName: 'Monstera Deliciosa',
    wateringIntervalDays: 10,
  },
  {
    category: 'Chaotic Overachiever',
    description: buildPlantDescription({
      careNote: 'keeps its marbling best with steady care',
      light: 'bright indirect light',
      potSizeCm: '2-4',
      repotYears: '2',
      wateringIntervalDays: 10,
    }),
    detailImage: marbleQueenPothos,
    detailImageUrl: DETAIL_IMAGE_URLS[2],
    image: marbleQueenPothos,
    isToxicToPets: true,
    lightNeed: 'bright',
    speciesId: 'marble-queen-pothos',
    speciesName: 'Marble Queen Pothos',
    wateringIntervalDays: 10,
  },
  {
    category: 'Low-Key Homebody',
    description: buildPlantDescription({
      careNote: 'handles normal room humidity calmly',
      light: 'low to bright indirect light',
      potSizeCm: '2-3',
      repotYears: '3',
      wateringIntervalDays: 12,
    }),
    detailImage: parlorPalm,
    detailImageUrl: DETAIL_IMAGE_URLS[3],
    image: parlorPalm,
    isToxicToPets: false,
    lightNeed: 'low',
    speciesId: 'parlor-palm',
    speciesName: 'Parlor Palm',
    wateringIntervalDays: 12,
  },
  {
    category: 'Lucky Charm',
    description: buildPlantDescription({
      careNote: 'prefers a consistent care rhythm',
      light: 'bright indirect light',
      potSizeCm: '3-5',
      repotYears: '2',
      wateringIntervalDays: 12,
    }),
    detailImage: moneyTree,
    detailImageUrl: DETAIL_IMAGE_URLS[4],
    image: moneyTree,
    isToxicToPets: false,
    lightNeed: 'bright',
    speciesId: 'money-tree',
    speciesName: 'Money Tree',
    wateringIntervalDays: 12,
  },
  {
    category: 'Silent Guardian',
    description: buildPlantDescription({
      careNote: 'dislikes being moved once settled',
      light: 'bright indirect light',
      potSizeCm: '3-5',
      repotYears: '2',
      wateringIntervalDays: 12,
    }),
    detailImage: rubberPlant,
    detailImageUrl: DETAIL_IMAGE_URLS[5],
    image: rubberPlant,
    isToxicToPets: true,
    lightNeed: 'bright',
    speciesId: 'rubber-plant',
    speciesName: 'Rubber Plant',
    wateringIntervalDays: 12,
  },
  {
    category: 'Dramatic Perfectionist',
    description: buildPlantDescription({
      careNote: 'prefers consistently moist soil',
      light: 'medium indirect light',
      potSizeCm: '2-3',
      repotYears: '2',
      wateringIntervalDays: 6,
    }),
    detailImage: prayerPlant,
    detailImageUrl: DETAIL_IMAGE_URLS[0],
    image: prayerPlant,
    isToxicToPets: false,
    lightNeed: 'bright',
    speciesId: 'prayer-plant',
    speciesName: 'Prayer Plant',
    wateringIntervalDays: 6,
  },
  {
    category: 'Easygoing Buddy',
    description: buildPlantDescription({
      careNote: 'tolerates dry spells with thick leaves',
      light: 'medium indirect light',
      potSizeCm: '2-3',
      repotYears: '3',
      wateringIntervalDays: 12,
    }),
    detailImage: variegatedPeperomia,
    detailImageUrl: DETAIL_IMAGE_URLS[1],
    image: variegatedPeperomia,
    isToxicToPets: false,
    lightNeed: 'bright',
    speciesId: 'variegated-peperomia',
    speciesName: 'Variegated Peperomia',
    wateringIntervalDays: 12,
  },
  {
    category: 'Desert minimalist',
    description: buildPlantDescription({
      careNote: 'only needs water when fully dry',
      light: 'bright filtered light',
      potSizeCm: '2-3',
      repotYears: '3',
      wateringIntervalDays: WATERING_INTERVAL_DAYS,
    }),
    detailImage: temporaryMonsteraThree,
    detailImageUrl: DETAIL_IMAGE_URLS[3],
    image: temporaryMonsteraThree,
    isToxicToPets: false,
    lightNeed: 'bright',
    speciesId: 'zebra-haworthia',
    speciesName: 'Zebra Haworthia',
    wateringIntervalDays: WATERING_INTERVAL_DAYS,
  },
  {
    category: 'Tiny survivor',
    description: buildPlantDescription({
      careNote: 'handles dry spells with sharp drainage',
      light: 'bright filtered light',
      potSizeCm: '2-3',
      repotYears: '3',
      wateringIntervalDays: WATERING_INTERVAL_DAYS,
    }),
    detailImage: marbleQueenPothos,
    detailImageUrl: DETAIL_IMAGE_URLS[4],
    image: marbleQueenPothos,
    isToxicToPets: false,
    lightNeed: 'bright',
    speciesId: 'zebra-cactus',
    speciesName: 'Zebra Cactus',
    wateringIntervalDays: WATERING_INTERVAL_DAYS,
  },
  {
    category: 'Striped drama',
    description: buildPlantDescription({
      careNote: 'grows quickly without soggy roots',
      light: 'bright indirect light',
      potSizeCm: '2-4',
      repotYears: '2',
      wateringIntervalDays: WATERING_INTERVAL_DAYS,
    }),
    detailImage: prayerPlant,
    detailImageUrl: DETAIL_IMAGE_URLS[5],
    image: prayerPlant,
    isToxicToPets: true,
    lightNeed: 'bright',
    speciesId: 'zebrina',
    speciesName: 'Zebrina',
    wateringIntervalDays: WATERING_INTERVAL_DAYS,
  },
  {
    category: 'Holiday bloomer',
    description: buildPlantDescription({
      careNote: 'likes a cooler rest before blooms',
      light: 'bright indirect light',
      potSizeCm: '2-4',
      repotYears: '2-3',
      wateringIntervalDays: WATERING_INTERVAL_DAYS,
    }),
    detailImage: variegatedPeperomia,
    detailImageUrl: DETAIL_IMAGE_URLS[0],
    image: variegatedPeperomia,
    isToxicToPets: false,
    lightNeed: 'bright',
    speciesId: 'zygocactus',
    speciesName: 'Zygocactus',
    wateringIntervalDays: WATERING_INTERVAL_DAYS,
  },
];

/**
 * Plants a first-time user starts with, so the app has something to show before they add
 * anything — and so the weather adjustment is visible at all.
 *
 * Last-watered dates are relative to launch rather than fixed, because a hard-coded date drifts
 * into "wildly overdue" within a week of writing it. The offsets are chosen against each
 * species' own interval so the set straddles the due line: one comfortably watered, one right on
 * the boundary, one overdue. Turning the weather switch on and off visibly moves the boundary
 * ones between the Water screen and the "Hydrated" state.
 */
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return date.toISOString();
}

export const initialOwnedPlants: OwnedPlant[] = [
  {
    addedAt: daysAgo(40),
    customName: 'Kevin',
    image: zzPlant,
    ownedPlantId: 'owned-plant-0',
    // 14-day interval, watered 13 days ago: not due today, but due if the weather shortens it.
    speciesId: 'zz-plant',
    wateringHistory: [daysAgo(27), daysAgo(13)],
  },
  {
    addedAt: daysAgo(30),
    customName: 'Big Steve',
    image: monsteraFull,
    ownedPlantId: 'owned-plant-1',
    // 10-day interval, watered 11 days ago: already due, and stays due either way.
    speciesId: 'monstera-deliciosa',
    wateringHistory: [daysAgo(21), daysAgo(11)],
  },
  {
    addedAt: daysAgo(20),
    customName: 'The Optimist',
    image: prayerPlant,
    ownedPlantId: 'owned-plant-2',
    // 6-day interval, watered 5 days ago: the most sensitive to a shift, being the shortest.
    speciesId: 'prayer-plant',
    wateringHistory: [daysAgo(11), daysAgo(5)],
  },
  {
    addedAt: daysAgo(12),
    customName: 'Mildred',
    image: parlorPalm,
    ownedPlantId: 'owned-plant-3',
    // 12-day interval, watered yesterday: comfortably not due, so the list is never all-due.
    speciesId: 'parlor-palm',
    wateringHistory: [daysAgo(1)],
  },
];

export function getSpeciesById(speciesId: string | undefined) {
  return mockSpecies.find(species => species.speciesId === speciesId);
}

// Common names a real identification/search result is likely to use, beyond the exact curated
// `speciesName` string above — used only to match a real (already-identified) name against this
// app's own curated care facts for speciesDetailsFallback.ts's synthesized-response fallback,
// never to invent a name shown to the user.
const MOCK_SPECIES_NAME_ALIASES: Record<string, string[]> = {
  'zz-plant': ['zz', 'zamioculcas', 'zanzibar gem'],
  'monstera-deliciosa': ['monstera', 'swiss cheese plant', 'ceriman'],
  'marble-queen-pothos': ['pothos', 'devils ivy', "devil's ivy", 'epipremnum'],
  'parlor-palm': ['chamaedorea', 'neanthe bella'],
  'money-tree': ['pachira', 'malabar chestnut', 'guiana chestnut'],
  'rubber-plant': ['rubber fig', 'ficus elastica'],
  'prayer-plant': ['maranta'],
  'variegated-peperomia': ['peperomia', 'radiator plant'],
  'zebra-haworthia': ['haworthia', 'haworthiopsis'],
  'zebra-cactus': ['zebra plant'],
  zebrina: ['tradescantia', 'wandering jew', 'inch plant'],
  zygocactus: ['schlumbergera', 'christmas cactus'],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word/phrase containment, not raw substring — a raw `.includes('zz')` would also match
 * any name that merely contains the letters "zz" (e.g. a real houseplant nickname like "Frizzle
 * Sizzle"), wrongly attributing zz-plant's care facts to it. */
function containsAsWord(haystack: string, needle: string): boolean {
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(haystack);
}

/** Fuzzy name match against this app's curated seed species — see speciesDetailsFallback.ts for
 * why this exists (it's a care-facts lookup, not a source of truth for names shown to users). */
export function findMockSpeciesByName(query: string): PlantSpecies | undefined {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;

  return mockSpecies.find(species => {
    if (species.speciesName.toLowerCase() === normalized) return true;

    const aliases = MOCK_SPECIES_NAME_ALIASES[species.speciesId] ?? [];
    return aliases.some(alias => containsAsWord(normalized, alias) || containsAsWord(alias, normalized));
  });
}
