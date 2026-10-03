/**
 * Writes the shipped plants' articles with the same DeepSeek article instruction the app uses for
 * searched plants, into src/features/plants/data/catalogArticles.ts. Run once, then review it.
 *
 *   npm run generate:articles                          # plants that have no article yet
 *   ONLY=zz-plant,aloe-vera npm run generate:articles  # rewrite just these
 *
 * Runs under Jest because Jest already compiles the app's TypeScript, its image imports and the
 * `@env` keys, which plain Node cannot load. `--no-cache` in the npm script matters: the babel
 * transform bakes `process.env.ONLY` into the cached build, so the last ONLY would otherwise stick.
 */
import fs from 'fs';
import path from 'path';

import { catalogSpecies } from '../src/features/plants/data/catalog';
import { CATALOG_ARTICLES } from '../src/features/plants/data/catalogArticles';
import { POPULAR_PLANTS } from '../src/features/plants/data/popularPlants';
import {
  type ArticleFacts,
  generateSpeciesArticles,
  WIKI_ARTICLE_PARAGRAPH_COUNT,
} from '../src/services/plantCopyApi';

const OUTPUT_PATH = path.join(__dirname, '../src/features/plants/data/catalogArticles.ts');
const SCRIPT_TIMEOUT_MS = 15 * 60 * 1000;
const BATCH_SIZE = 4;
const MAX_ATTEMPTS = 6;
// Two words catch the same move ("When it comes to light" / "When it comes to watering").
const REPEAT_WORDS = 2;
// Across 132 paragraphs a common two-word opening may recur a few times without reading as a
// template; past this it does.
const MAX_REPEATS = 4;
// The surprising detail belongs inside the prose (user ruling, 2026-10-04): a label announcing it
// ("Here's a fun fact:", "Interesting fact:") reads like a quiz card.
const ANNOUNCED_FACT = /(fun|interesting|quirky|cool|surprising|curious|bonus|neat)[\w\s-]{0,12}(fact|thing|detail|tidbit|trivia)|here['’]?s (something|a|the)\b|did you know/i;

function paragraphs(article: string) {
  return article.split('\n\n').filter(paragraph => paragraph.trim().length > 0);
}

function lead(paragraph: string, words: number) {
  return paragraph.trim().split(/\s+/).slice(0, words).join(' ');
}

function leadKey(paragraph: string) {
  return lead(paragraph, REPEAT_WORDS).toLowerCase().replace(/[^a-z' ]/g, '');
}

/**
 * Why this batch would make the set read like a template or break the shape, or null: the prompt
 * asks for variety, this checks it across the whole set, which no single request can see.
 */
function problemWith(batch: string[], others: string[]): string | null {
  const used = new Map<string, number>();
  const count = (paragraph: string) => used.set(leadKey(paragraph), (used.get(leadKey(paragraph)) ?? 0) + 1);
  others.flatMap(paragraphs).forEach(count);

  for (const article of batch) {
    const announced = article.match(ANNOUNCED_FACT);
    if (announced) return `an announced fact ("${announced[0]}")`;
    if (paragraphs(article).length !== WIKI_ARTICLE_PARAGRAPH_COUNT) {
      return `an article with ${paragraphs(article).length} paragraphs`;
    }
    for (const paragraph of paragraphs(article)) {
      count(paragraph);
      if ((used.get(leadKey(paragraph)) ?? 0) > MAX_REPEATS) return `"${leadKey(paragraph)}" opening too often`;
    }
  }

  return null;
}

function factsFor(speciesId: string): ArticleFacts {
  const species = catalogSpecies.find(entry => entry.speciesId === speciesId)!;
  const traits = POPULAR_PLANTS.find(plant => plant.speciesId === speciesId);

  return {
    commonName: species.speciesName,
    humidityNeed: traits?.humidityNeed,
    isToxicToPets: species.isToxicToPets,
    lightNeed: species.lightNeed,
    minTempC: traits?.minTempC,
    wateringIntervalDays: species.wateringIntervalDays,
  };
}

async function writeBatch(speciesIds: string[], others: string[]): Promise<string[]> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let batch: string[];
    try {
      batch = await generateSpeciesArticles(speciesIds.map(factsFor));
    } catch (error) {
      // A creative temperature now and then produces broken JSON; the next attempt is a new draw.
      console.log(`${speciesIds.join(', ')}: ${(error as Error).message}, retrying`);
      continue;
    }
    const problem = problemWith(batch, others);
    if (!problem) return batch;
    console.log(`${speciesIds.join(', ')}: ${problem}, retrying`);
  }

  throw new Error(`${speciesIds.join(', ')}: no usable batch after ${MAX_ATTEMPTS} attempts`);
}

function render(articles: Record<string, string>) {
  const entries = Object.keys(articles)
    .sort()
    .map(speciesId => `  ${JSON.stringify(speciesId)}:\n    ${JSON.stringify(articles[speciesId])},`)
    .join('\n');

  return `/**
 * Articles for the plants that ship with the app, written by scripts/generateCatalogArticles.ts with
 * the same DeepSeek article instruction as searched plants, and checked against each plant's data.
 * Generated: change one by rerunning the script for that plant (ONLY=<id>), not by hand.
 */
export const CATALOG_ARTICLES: Record<string, string> = {
${entries}
};
`;
}

it('writes the catalog articles', async () => {
  const only = process.env.ONLY?.split(',').map(id => id.trim()).filter(Boolean);
  const targets = catalogSpecies
    .map(species => species.speciesId)
    .filter(speciesId => (only ? only.includes(speciesId) : !CATALOG_ARTICLES[speciesId]));
  const articles = { ...CATALOG_ARTICLES };
  targets.forEach(speciesId => delete articles[speciesId]);

  for (let start = 0; start < targets.length; start += BATCH_SIZE) {
    const speciesIds = targets.slice(start, start + BATCH_SIZE);
    const batch = await writeBatch(speciesIds, Object.values(articles));
    speciesIds.forEach((speciesId, index) => {
      articles[speciesId] = batch[index];
    });
    // Written after every batch, so a failure part-way keeps what was already paid for.
    fs.writeFileSync(OUTPUT_PATH, render(articles));
    console.log(`${speciesIds.join(', ')}: done`);
  }
}, SCRIPT_TIMEOUT_MS);
