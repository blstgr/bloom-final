import { PLANT_DESCRIPTION_MAX_CHARS } from '../features/plants/data/plantDescription';

import { getDeepSeekApiKey } from './config';
import { DEEPSEEK_BASE_URL } from './constants';
import { FORBIDDEN_STATUS } from './http';
import type { GeneratedSpeciesCopy, PerenualSpeciesDetails, ResolvedCareFacts } from './types';

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
// A quick mobile card (~100-130 words), not an unbounded profile — DeepSeek's generation time
// scales with output length, and an uncapped wikiArticle was the single slowest leg of the whole
// "snap photo -> full article" wait.
export const WIKI_ARTICLE_MAX_CHARS = 700;
// Hard backstops on top of the character budgets above, in case the model doesn't respect them —
// bounds worst-case generation time even if the prompt's length request is ignored. ~4 chars per
// token is a safe rough estimate for English; margin covers JSON structure overhead.
const GENERATION_MAX_TOKENS = 400;
const DESCRIPTION_RETRY_MAX_TOKENS = 120;

function buildFactsBlock(resolvedFacts: ResolvedCareFacts, rawDetails: PerenualSpeciesDetails) {
  return `- Watering interval: every ${resolvedFacts.wateringIntervalDays} days
- Pot size: drainage holes ${resolvedFacts.potSizeRecommendationCm} cm larger than the roots
- Repotting: every ${resolvedFacts.repottingScheduleYears} years
- Toxic to pets: ${resolvedFacts.isToxicToPets ? 'yes' : 'no'}
- Care level: ${rawDetails.care_level ?? 'unknown'}
- Sunlight: ${(rawDetails.sunlight ?? []).join(', ') || 'unknown'}`;
}

function buildPrompt(resolvedFacts: ResolvedCareFacts, rawDetails: PerenualSpeciesDetails, budget: number) {
  return `You are writing plant care copy for a houseplant app. These facts are fixed and must
appear, phrased naturally, but never changed or contradicted:
${buildFactsBlock(resolvedFacts, rawDetails)}

Return strict JSON with exactly these keys:
- "category": a short, funny/creative label in sentence case summarizing how demanding this
  plant is (e.g. "Independent roommate", "High-maintenance diva"), grounded in the care level above, not a new
  fact.
- "description": ${budget} characters or fewer. Required facts first (watering, pot size,
  repotting, toxicity), creative flourish last, so truncation only ever cuts flavor text.
- "wikiArticle": ${WIKI_ARTICLE_MAX_CHARS} characters or fewer. A quick-read mobile card, not a
  full profile — cover exactly: light needs, how often to water, pet toxicity, and one or two
  genuinely interesting facts about the plant. Separate paragraphs with a blank line (\\n\\n).`;
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
${buildFactsBlock(resolvedFacts, rawDetails)}

Return strict JSON with exactly one key: "description".`;
}

async function requestJson(prompt: string, maxTokens: number): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      body: JSON.stringify({
        max_tokens: maxTokens,
        messages: [{ content: prompt, role: 'user' }],
        model: DEEPSEEK_MODEL,
        response_format: { type: 'json_object' },
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
    throw new PlantCopyApiError('unknown', 'Copy generation returned malformed JSON.');
  }
}

async function requestGeneration(
  resolvedFacts: ResolvedCareFacts,
  rawDetails: PerenualSpeciesDetails,
  budget: number,
): Promise<GeneratedSpeciesCopy> {
  const prompt = buildPrompt(resolvedFacts, rawDetails, budget);
  const parsed = (await requestJson(prompt, GENERATION_MAX_TOKENS)) as Partial<GeneratedSpeciesCopy>;

  if (
    typeof parsed.category !== 'string' ||
    typeof parsed.description !== 'string' ||
    typeof parsed.wikiArticle !== 'string'
  ) {
    throw new PlantCopyApiError('unknown', 'Copy generation response is missing required fields.');
  }

  return parsed as GeneratedSpeciesCopy;
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
    throw new PlantCopyApiError('unknown', 'Copy generation response is missing required fields.');
  }

  return parsed.description;
}

function trimToSentenceBoundary(text: string, maxLength: number): string {
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  return lastPeriod > 0 ? truncated.slice(0, lastPeriod + 1) : truncated;
}

/**
 * One DeepSeek request produces the short description and the long wiki article together, so
 * they can never drift out of sync with each other or with resolvedFacts. If the description
 * overflows PLANT_DESCRIPTION_MAX_CHARS, regenerates ONLY the description (category/wikiArticle
 * are already fine) with a tighter budget, then falls back to a deterministic sentence-boundary
 * trim rather than let an overlong description reach buildPlantDescription-shaped consumers.
 * `wikiArticle` gets the same deterministic trim (never a regeneration — the whole point of
 * capping it was to cut latency, and a retry call would undo that) if it overflows
 * WIKI_ARTICLE_MAX_CHARS, since the prompt's length instruction and the token budget are both
 * only soft backstops the model isn't guaranteed to respect.
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

  if (copy.wikiArticle.length > WIKI_ARTICLE_MAX_CHARS) {
    copy = { ...copy, wikiArticle: trimToSentenceBoundary(copy.wikiArticle, WIKI_ARTICLE_MAX_CHARS) };
  }

  return copy;
}
