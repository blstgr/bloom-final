import { PLANT_DESCRIPTION_MAX_CHARS } from '../features/plants/data/plantDescription';

import { getDeepSeekApiKey } from './config';
import { DEEPSEEK_BASE_URL } from './constants';
import { FORBIDDEN_STATUS } from './http';
import type { GeneratedSpeciesCopy, PerenualSpeciesDetails, PlantLightNeed, ResolvedCareFacts } from './types';

export type PlantCopyApiErrorKind = 'forbidden' | 'network' | 'unknown';

export class PlantCopyApiError extends Error {
  kind: PlantCopyApiErrorKind;

  constructor(kind: PlantCopyApiErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'PlantCopyApiError';
  }
}

const DEEPSEEK_MODEL = 'deepseek-chat';
const RETRY_BUDGET_MARGIN = 20;
// Four short paragraphs, ~150-220 words: an article to read, not a card. Still capped, because
// DeepSeek's generation time scales with output length and this is the slowest leg of opening a
// searched plant; the article is stored once written, so the wait is paid once per plant.
export const WIKI_ARTICLE_MAX_CHARS = 1400;
export const WIKI_ARTICLE_PARAGRAPH_COUNT = 4;
// Hard backstops on top of the character budgets above, in case the model doesn't respect them —
// bounds worst-case generation time even if the prompt's length request is ignored. ~4 chars per
// token is a safe rough estimate for English; margin covers JSON structure overhead.
const GENERATION_MAX_TOKENS = 800;
const ARTICLE_MAX_TOKENS = 900;
const DESCRIPTION_RETRY_MAX_TOKENS = 120;

/** What an article is written from, whichever source the plant came from. */
export type ArticleFacts = {
  careLevel?: string | null;
  commonName: string;
  /** Only known for shipped plants. */
  humidityNeed?: string;
  isToxicToPets: boolean;
  lightNeed: PlantLightNeed;
  /** Coldest it tolerates, in °C. Only known for shipped plants. */
  minTempC?: number;
  scientificName?: string;
  wateringIntervalDays: number;
};

const LIGHT_NEED_TEXT: Record<PlantLightNeed, string> = {
  bright: 'bright indirect light',
  low: 'copes with low light',
};

// DeepSeek's recommended temperature for creative writing; the default reads as a template when
// it writes many articles.
const ARTICLE_TEMPERATURE = 1.3;

/** Facts as plain data rather than ready-made sentences, so the article doesn't echo their wording.
 * One block for both sources, so a searched plant's article is written from the same kind of input
 * as a shipped plant's; `extra` carries the description-only facts on-open generation also needs. */
function buildFactsBlock(facts: ArticleFacts, extra: Record<string, string> = {}) {
  const data: Record<string, string | number | boolean> = {
    name: facts.commonName,
    light: LIGHT_NEED_TEXT[facts.lightNeed],
    waterEveryDays: facts.wateringIntervalDays,
    toxicToCatsAndDogs: facts.isToxicToPets,
  };
  if (facts.scientificName) data.scientificName = facts.scientificName;
  if (facts.careLevel) data.careLevel = facts.careLevel;
  if (facts.humidityNeed) data.humidity = facts.humidityNeed;
  if (facts.minTempC != null) data.minTemperatureC = facts.minTempC;

  return JSON.stringify({ ...data, ...extra });
}

/** A searched plant's article facts, from what Perenual and the care resolution know about it. */
function articleFactsFor(resolvedFacts: ResolvedCareFacts, rawDetails: PerenualSpeciesDetails): ArticleFacts {
  return {
    careLevel: rawDetails.care_level,
    commonName: rawDetails.common_name,
    isToxicToPets: resolvedFacts.isToxicToPets,
    lightNeed: resolvedFacts.lightNeed,
    scientificName: rawDetails.scientific_name[0],
    wateringIntervalDays: resolvedFacts.wateringIntervalDays,
  };
}

/** The description also states pot size and repotting, which an article doesn't need. */
function buildDescriptionFactsBlock(resolvedFacts: ResolvedCareFacts, rawDetails: PerenualSpeciesDetails) {
  return buildFactsBlock(articleFactsFor(resolvedFacts, rawDetails), {
    potWithDrainageHolesCmLargerThanRoots: resolvedFacts.potSizeRecommendationCm,
    repotEveryYears: resolvedFacts.repottingScheduleYears,
  });
}

/** The one description of an article, shared by the app's on-open generation and the script that
 * writes the shipped plants' articles, so both read the same. Said as what to do, not what to
 * avoid: naming a phrase to avoid only primes the model to use it. Kept apart from the JSON key it
 * fills, since the on-open prompt names the key and the batch prompt keys articles by plant. */
const ARTICLE_INSTRUCTION = `${WIKI_ARTICLE_MAX_CHARS} characters or fewer, ${WIKI_ARTICLE_PARAGRAPH_COUNT} short
  paragraphs separated by a blank line (\\n\\n). Somewhere in it, tell the reader what the plant is
  and where it comes from, where to put it for the light it likes, how often to water it (the exact
  number of days) and how it feels about humidity, whether it is safe around cats and dogs, and
  something about it most people don't know, told as part of the story the way you'd mention it in
  conversation rather than set apart and introduced. The order and the angle are yours: start from whatever is most
  striking about this particular plant (its reputation, how it moves or flowers, the mistake people
  make with it, a bit of its history) and weave the care in where it fits naturally; the four
  paragraphs need not map one-to-one onto those topics, but there are always four. Write the way a friend who knows plants would talk about this
  one: sentences of different lengths and shapes, plain and warm with a little wit, and always clear
  about watering and pet safety. Plain prose, no headings, lists or markdown.`;

function buildPrompt(resolvedFacts: ResolvedCareFacts, rawDetails: PerenualSpeciesDetails, budget: number) {
  return `You are writing plant care copy for a houseplant app. These facts are fixed and must
appear, phrased naturally, but never changed or contradicted:
${buildDescriptionFactsBlock(resolvedFacts, rawDetails)}

Return strict JSON with exactly these keys:
- "category": a short, funny/creative label in sentence case summarizing how demanding this
  plant is (e.g. "Independent roommate", "High-maintenance diva"), grounded in the care level above, not a new
  fact.
- "description": ${budget} characters or fewer. Required facts first (watering, pot size,
  repotting, toxicity), creative flourish last, so truncation only ever cuts flavor text.
- "wikiArticle": ${ARTICLE_INSTRUCTION}`;
}

function buildArticlesPrompt(plants: ArticleFacts[]) {
  const factLines = plants.map((facts, index) => `"${index + 1}": ${buildFactsBlock(facts)}`).join('\n');

  return `You are writing articles for a houseplant app, one per plant. The facts are fixed: use
them, never change or contradict them.

${factLines}

The articles sit side by side in the app, so each starts from a different angle and follows its
own order.

Return strict JSON with one key per plant ("1", "2", ...), each value the article, written as
follows.
${ARTICLE_INSTRUCTION}`;
}

/** Much smaller than the full prompt above — asks for nothing but a shorter description, so the
 * (not-uncommon) description-overflow case costs a small regeneration instead of a second
 * full-size one that redoes an already-fine category/wikiArticle. */
function buildDescriptionRetryPrompt(
  resolvedFacts: ResolvedCareFacts,
  rawDetails: PerenualSpeciesDetails,
  budget: number,
) {
  return `Rewrite ONLY a plant care "description" for a houseplant app, ${budget} characters or
fewer, required facts first (watering, pot size, repotting, toxicity) with any creative flourish
last, so truncation only ever cuts flavor text. These facts are fixed and must appear, phrased
naturally, but never changed or contradicted:
${buildDescriptionFactsBlock(resolvedFacts, rawDetails)}

Return strict JSON with exactly one key: "description".`;
}

/** A response that arrived but can't be used: broken JSON, or a required field missing or of the
 * wrong type. Still an `unknown` PlantCopyApiError to callers; the subclass only lets on-open
 * generation tell it apart from a transport failure, which a second draw wouldn't fix. */
class MalformedResponseError extends PlantCopyApiError {
  constructor(message: string) {
    super('unknown', message);
  }
}

async function requestJson(prompt: string, maxTokens: number, temperature?: number): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      body: JSON.stringify({
        max_tokens: maxTokens,
        messages: [{ content: prompt, role: 'user' }],
        model: DEEPSEEK_MODEL,
        response_format: { type: 'json_object' },
        temperature,
      }),
      headers: {
        Authorization: `Bearer ${getDeepSeekApiKey()}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  } catch {
    throw new PlantCopyApiError('network', 'Could not reach the copy generation service.');
  }

  if (response.status === FORBIDDEN_STATUS) {
    // Distinct from every other failure: the key/IP itself is rejected, not a transient or
    // content-related problem — matches the same `forbidden` split already used for Perenual
    // (PlantApiError) and Pl@ntNet (PlantIdApiError).
    throw new PlantCopyApiError('forbidden', 'Copy generation access denied.');
  }

  if (!response.ok) {
    throw new PlantCopyApiError('unknown', `Copy generation failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const content: string | undefined = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new PlantCopyApiError('unknown', 'Copy generation returned no content.');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new MalformedResponseError('Copy generation returned malformed JSON.');
  }
}

async function requestGenerationOnce(
  resolvedFacts: ResolvedCareFacts,
  rawDetails: PerenualSpeciesDetails,
  budget: number,
): Promise<GeneratedSpeciesCopy> {
  const prompt = buildPrompt(resolvedFacts, rawDetails, budget);
  const parsed = (await requestJson(prompt, GENERATION_MAX_TOKENS, ARTICLE_TEMPERATURE)) as Partial<GeneratedSpeciesCopy>;

  if (
    typeof parsed.category !== 'string' ||
    typeof parsed.description !== 'string' ||
    typeof parsed.wikiArticle !== 'string'
  ) {
    throw new MalformedResponseError('Copy generation response is missing required fields.');
  }

  return parsed as GeneratedSpeciesCopy;
}

/** At the creative temperature a response is now and then malformed; one more draw usually isn't,
 * and is cheaper for the user than failing the plant open (final-project-spec §3.8). Only one, so
 * a model that keeps failing costs at most twice the wait. */
async function requestGeneration(
  resolvedFacts: ResolvedCareFacts,
  rawDetails: PerenualSpeciesDetails,
  budget: number,
): Promise<GeneratedSpeciesCopy> {
  try {
    return await requestGenerationOnce(resolvedFacts, rawDetails, budget);
  } catch (error) {
    if (!(error instanceof MalformedResponseError)) throw error;
    return requestGenerationOnce(resolvedFacts, rawDetails, budget);
  }
}

async function requestShorterDescription(
  resolvedFacts: ResolvedCareFacts,
  rawDetails: PerenualSpeciesDetails,
  budget: number,
): Promise<string> {
  const prompt = buildDescriptionRetryPrompt(resolvedFacts, rawDetails, budget);
  const parsed = (await requestJson(prompt, DESCRIPTION_RETRY_MAX_TOKENS)) as Partial<
    Pick<GeneratedSpeciesCopy, 'description'>
  >;

  if (typeof parsed.description !== 'string') {
    throw new MalformedResponseError('Copy generation response is missing required fields.');
  }

  return parsed.description;
}

/** One blank line between paragraphs, however the model separated them: at a creative temperature
 * it sometimes uses a single line break, which the article screen would show as one paragraph. */
function normalizeParagraphs(article: string): string {
  return article.trim().split(/\n\s*/).filter(paragraph => paragraph.length > 0).join('\n\n');
}

function trimToSentenceBoundary(text: string, maxLength: number): string {
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  return lastPeriod > 0 ? truncated.slice(0, lastPeriod + 1) : truncated;
}

const SENTENCE = /[^.!?]*[.!?]+["'’”)]*\s*|[^.!?]+$/g;

function sentencesOf(paragraph: string): string[] {
  return paragraph.match(SENTENCE) ?? [paragraph];
}

/**
 * Brings an article under maxLength by taking sentences out of its middle paragraphs, the longest
 * first, so the opening and the closing paragraph always survive (final-project-spec §3.8: the
 * closing paragraph is never the one lost). Every middle paragraph keeps its last sentence, so the
 * article never comes out with fewer paragraphs than it had (§3.8: never empties a middle
 * paragraph). If that shortest shape still overruns the cap, it is kept as it is: the cap exists
 * to bound generation time, which has already been spent, so a little over beats losing the end
 * (ruling E4, §3.8).
 */
function shortenFromMiddle(article: string, maxLength: number): string {
  const paragraphs = article.split('\n\n').map(sentencesOf);
  const length = () => paragraphs.map(sentences => sentences.join('').trim()).join('\n\n').length;
  const shortenable = () => paragraphs.slice(1, -1).filter(sentences => sentences.length > 1);

  let candidates = shortenable();
  while (length() > maxLength && candidates.length > 0) {
    const longest = candidates.reduce((a, b) => (b.join('').length > a.join('').length ? b : a));
    longest.pop();
    candidates = shortenable();
  }

  return paragraphs.map(sentences => sentences.join('').trim()).join('\n\n');
}

/** The same clean-up for every article, whichever path wrote it: paragraphs normalized, then held
 * to WIKI_ARTICLE_MAX_CHARS, since the prompt's length request and the token budget are only soft
 * backstops. However many paragraphs came back are kept (§3.8: shown as returned, not re-asked). */
function finishArticle(article: string): string {
  const normalized = normalizeParagraphs(article);
  return normalized.length > WIKI_ARTICLE_MAX_CHARS ? shortenFromMiddle(normalized, WIKI_ARTICLE_MAX_CHARS) : normalized;
}

/**
 * One DeepSeek request produces the short description and the long wiki article together, so
 * they can never drift out of sync with each other or with resolvedFacts. A malformed response is
 * drawn once more (see requestGeneration). If the description overflows
 * PLANT_DESCRIPTION_MAX_CHARS, regenerates ONLY the description (category/wikiArticle are already
 * fine) with a tighter budget, then falls back to a deterministic sentence-boundary trim rather
 * than let an overlong description reach buildPlantDescription-shaped consumers. `wikiArticle` is
 * never regenerated (the whole point of capping it was to cut latency, and a retry call would undo
 * that): finishArticle shortens it from the middle if it overflows WIKI_ARTICLE_MAX_CHARS.
 *
 * Deliberately doesn't know whether a real species photo was found — that's resolved
 * independently (in parallel, not sequentially) by the caller, which prepends a deterministic
 * (non-generated) acknowledgment sentence itself when there's no photo. Keeping this function
 * photo-agnostic is what lets photo search and copy generation run concurrently instead of
 * stacking their latency.
 */
export async function generateSpeciesCopy(
  resolvedFacts: ResolvedCareFacts,
  rawDetails: PerenualSpeciesDetails,
): Promise<GeneratedSpeciesCopy> {
  let copy = await requestGeneration(resolvedFacts, rawDetails, PLANT_DESCRIPTION_MAX_CHARS);

  if (copy.description.length > PLANT_DESCRIPTION_MAX_CHARS) {
    const shorterDescription = await requestShorterDescription(
      resolvedFacts,
      rawDetails,
      PLANT_DESCRIPTION_MAX_CHARS - RETRY_BUDGET_MARGIN,
    );
    copy = { ...copy, description: shorterDescription };
  }

  if (copy.description.length > PLANT_DESCRIPTION_MAX_CHARS) {
    copy = { ...copy, description: trimToSentenceBoundary(copy.description, PLANT_DESCRIPTION_MAX_CHARS) };
  }

  return { ...copy, wikiArticle: finishArticle(copy.wikiArticle) };
}

/**
 * Articles alone, for plants that already have their category and description: the shipped catalog
 * (scripts/generateCatalogArticles.ts). Same article instruction and the same finishArticle as
 * generateSpeciesCopy. Several plants per request on purpose: written one at a time a set
 * converges on the same few openings, while articles the model can see side by side come out
 * varied. No retry here: the script redraws a batch itself, for its own checks as well.
 */
export async function generateSpeciesArticles(plants: ArticleFacts[]): Promise<string[]> {
  const parsed = (await requestJson(
    buildArticlesPrompt(plants),
    ARTICLE_MAX_TOKENS * plants.length,
    ARTICLE_TEMPERATURE,
  )) as Record<string, unknown>;

  return plants.map((_, index) => {
    const article = parsed[String(index + 1)];
    if (typeof article !== 'string') {
      throw new MalformedResponseError('Copy generation response is missing required fields.');
    }

    return finishArticle(article);
  });
}
