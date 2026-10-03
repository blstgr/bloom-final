import { PLANT_DESCRIPTION_MAX_CHARS } from '../features/plants/data/plantDescription';

import { generateSpeciesCopy, PlantCopyApiError, WIKI_ARTICLE_MAX_CHARS } from './plantCopyApi';
import type { GeneratedSpeciesCopy, PerenualSpeciesDetails, ResolvedCareFacts } from './types';

const RESOLVED_FACTS: ResolvedCareFacts = {
  isToxicToPets: false,
  lightNeed: 'bright',
  potSizeRecommendationCm: '2-4',
  repottingScheduleYears: '2-3',
  wateringIntervalDays: 14,
};

const RAW_DETAILS: PerenualSpeciesDetails = {
  care_level: 'Moderate',
  common_name: 'ZZ plant',
  default_image: null,
  dimensions: null,
  growth_rate: 'Low',
  id: 1,
  poisonous_to_humans: false,
  poisonous_to_pets: false,
  scientific_name: ['Zamioculcas zamiifolia'],
  sunlight: ['part shade'],
  watering_general_benchmark: { unit: 'days', value: '14' },
};

function mockChatCompletion(...contents: GeneratedSpeciesCopy[]) {
  const fetchMock = jest.fn();
  contents.forEach(content => {
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(content) } }] }),
      ok: true,
    });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function mockRawChatCompletion(...rawContents: string[]) {
  const fetchMock = jest.fn();
  rawContents.forEach(rawContent => {
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ choices: [{ message: { content: rawContent } }] }),
      ok: true,
    });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function article(...paragraphs: string[]) {
  return paragraphs.join('\n\n');
}

const VALID_COPY: GeneratedSpeciesCopy = {
  category: 'Independent roommate',
  description: 'Short description.',
  wikiArticle: article('One.', 'Two.', 'Three.', 'Four.'),
};

describe('generateSpeciesCopy', () => {
  it('returns the generated copy as-is when the description fits the budget', async () => {
    const copy: GeneratedSpeciesCopy = {
      category: 'Independent Roommate',
      description: 'Short description.',
      wikiArticle: 'A longer article.',
    };
    mockChatCompletion(copy);

    expect(await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).toEqual(copy);
  });

  it('regenerates only the description (not category/wikiArticle) when it overflows', async () => {
    const tooLong: GeneratedSpeciesCopy = {
      category: 'Independent Roommate',
      description: 'x'.repeat(PLANT_DESCRIPTION_MAX_CHARS + 50),
      wikiArticle: 'A longer article.',
    };
    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(tooLong) } }] }),
      ok: true,
    });
    // The retry is a much smaller request: it asks for (and the mock here returns) only a
    // "description" field, not a full category/description/wikiArticle payload.
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({
        choices: [{ message: { content: JSON.stringify({ description: 'A properly sized description.' }) } }],
      }),
      ok: true,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS);
    expect(result).toEqual({
      category: 'Independent Roommate',
      description: 'A properly sized description.',
      wikiArticle: 'A longer article.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to a deterministic sentence-boundary trim if the retry still overflows', async () => {
    const sentence = 'x'.repeat(PLANT_DESCRIPTION_MAX_CHARS - 10);
    const stillTooLong: GeneratedSpeciesCopy = {
      category: 'Independent Roommate',
      description: `${sentence}. ${'y'.repeat(50)}.`,
      wikiArticle: 'A longer article.',
    };
    mockChatCompletion(stillTooLong, stillTooLong);

    const result = await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS);
    expect(result.description.length).toBeLessThanOrEqual(PLANT_DESCRIPTION_MAX_CHARS);
    expect(result.description.endsWith('.')).toBe(true);
  });

  it('never regenerates an overlong wikiArticle, and keeps a one-paragraph one whole', async () => {
    // Unlike description, wikiArticle never gets a retry call — the whole point of capping it was
    // to cut latency, and a retry call would undo that. With no middle paragraph to shorten, it is
    // kept as written rather than cut (ruling E4, final-project-spec §3.8).
    const sentence = 'x'.repeat(WIKI_ARTICLE_MAX_CHARS - 10);
    const tooLong: GeneratedSpeciesCopy = {
      category: 'Independent Roommate',
      description: 'Short description.',
      wikiArticle: `${sentence}. ${'y'.repeat(50)}.`,
    };
    const fetchMock = mockChatCompletion(tooLong);

    const result = await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS);
    expect(result.wikiArticle).toBe(tooLong.wikiArticle);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws a network PlantCopyApiError when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('offline')) as unknown as typeof fetch;
    await expect(generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).rejects.toMatchObject<Partial<PlantCopyApiError>>({
      kind: 'network',
    });
  });

  it('throws a forbidden PlantCopyApiError on a 403, distinct from unknown', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 403 }) as unknown as typeof fetch;
    await expect(generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).rejects.toMatchObject<Partial<PlantCopyApiError>>({
      kind: 'forbidden',
    });
  });

  it('throws an unknown PlantCopyApiError on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).rejects.toBeInstanceOf(PlantCopyApiError);
  });

  it('throws a classified PlantCopyApiError when the model returns malformed JSON twice', async () => {
    mockRawChatCompletion('{not valid json', '{still not valid');

    await expect(generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).rejects.toMatchObject<Partial<PlantCopyApiError>>({
      kind: 'unknown',
    });
  });

  it('throws a classified PlantCopyApiError when the response is missing a required field', async () => {
    const missing = JSON.stringify({ category: 'Independent Roommate', description: 'desc' });
    mockRawChatCompletion(missing, missing);

    await expect(generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).rejects.toMatchObject<Partial<PlantCopyApiError>>({
      kind: 'unknown',
    });
  });

  it('throws a classified PlantCopyApiError when a field has the wrong type', async () => {
    const wrongType = JSON.stringify({ category: 'Independent Roommate', description: 123, wikiArticle: 'article' });
    mockRawChatCompletion(wrongType, wrongType);

    await expect(generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).rejects.toMatchObject<Partial<PlantCopyApiError>>({
      kind: 'unknown',
    });
  });

  it('draws once more when the first response is malformed JSON, and returns the second', async () => {
    const fetchMock = mockRawChatCompletion('{not valid json', JSON.stringify(VALID_COPY));

    expect(await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).toEqual(VALID_COPY);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('draws once more when the first response is missing a field', async () => {
    const fetchMock = mockRawChatCompletion(JSON.stringify({ category: 'x', description: 'y' }), JSON.stringify(VALID_COPY));

    expect(await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).toEqual(VALID_COPY);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a malformed response only once', async () => {
    const fetchMock = mockRawChatCompletion('{bad', '{bad', JSON.stringify(VALID_COPY));

    await expect(generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).rejects.toBeInstanceOf(PlantCopyApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a transport failure', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS)).rejects.toBeInstanceOf(PlantCopyApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([3, 5])('keeps an article of %i paragraphs as returned, without asking again', async count => {
    const paragraphs = Array.from({ length: count }, (_, index) => `Paragraph ${index + 1}.`);
    const fetchMock = mockChatCompletion({ ...VALID_COPY, wikiArticle: article(...paragraphs) });

    const result = await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS);
    expect(result.wikiArticle).toBe(article(...paragraphs));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shortens an overlong article from the middle, so the closing paragraph survives', async () => {
    const sentence = `${'w'.repeat(99)}.`;
    const middle = Array.from({ length: 5 }, () => sentence).join(' ');
    const closing = 'Keep it away from cats. That is the closing paragraph.';
    const tooLong = article('An opening.', middle, middle, middle, closing);
    expect(tooLong.length).toBeGreaterThan(WIKI_ARTICLE_MAX_CHARS);
    mockChatCompletion({ ...VALID_COPY, wikiArticle: tooLong });

    const result = await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS);
    const paragraphs = result.wikiArticle.split('\n\n');
    expect(result.wikiArticle.length).toBeLessThanOrEqual(WIKI_ARTICLE_MAX_CHARS);
    expect(paragraphs[0]).toBe('An opening.');
    expect(paragraphs[paragraphs.length - 1]).toBe(closing);
    expect(paragraphs).toHaveLength(5);
  });

  it('never empties a middle paragraph while shortening, so the paragraph count holds', async () => {
    // The longest middle paragraph is a single sentence; taking it would drop the article to three
    // paragraphs. The sentences come out of the other middle paragraph instead.
    const opening = `${'o'.repeat(399)}.`;
    const singleSentenceMiddle = `${'s'.repeat(449)}.`;
    const shortSentence = `${'m'.repeat(99)}.`;
    const multiSentenceMiddle = [shortSentence, shortSentence, shortSentence].join(' ');
    const closing = `${'c'.repeat(399)}.`;
    const tooLong = article(opening, singleSentenceMiddle, multiSentenceMiddle, closing);
    expect(tooLong.length).toBeGreaterThan(WIKI_ARTICLE_MAX_CHARS);
    mockChatCompletion({ ...VALID_COPY, wikiArticle: tooLong });

    const result = await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS);
    expect(result.wikiArticle.length).toBeLessThanOrEqual(WIKI_ARTICLE_MAX_CHARS);
    expect(result.wikiArticle.split('\n\n')).toEqual([opening, singleSentenceMiddle, shortSentence, closing]);
  });

  it('keeps every paragraph when even the shortest shape is over the cap, rather than cut the end', async () => {
    const opening = `${'o'.repeat(799)}.`;
    const middle = `${'m'.repeat(99)}.`;
    const closing = `${'c'.repeat(799)}.`;
    const tooLong = article(opening, middle, middle, closing);
    mockChatCompletion({ ...VALID_COPY, wikiArticle: tooLong });

    const result = await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS);
    expect(result.wikiArticle).toBe(tooLong);
  });

  it('writes the article from the same kind of facts block as the shipped plants', async () => {
    const fetchMock = mockChatCompletion(VALID_COPY);

    await generateSpeciesCopy(RESOLVED_FACTS, RAW_DETAILS);
    const prompt: string = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('"scientificName":"Zamioculcas zamiifolia","careLevel":"Moderate"');
    expect(prompt).toContain('"waterEveryDays":14');
  });
});
