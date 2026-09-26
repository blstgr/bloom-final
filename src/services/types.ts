// Perenual `species-list` / `species/details/{id}` response shapes (only the fields this app
// reads — Perenual's real payloads carry many more).

export type PerenualSpeciesListItem = {
  common_name: string;
  default_image: { thumbnail: string; small_url: string; medium_url: string } | null;
  id: number;
  scientific_name: string[];
};

export type PerenualSpeciesListResponse = {
  data: PerenualSpeciesListItem[];
};

// Perenual's real dimensions entries are inconsistently populated in practice — any of these
// fields can come back null even though the type/unit/value concept is present on the entry.
export type PerenualDimensions = {
  max_value: number | null;
  min_value: number | null;
  type: string | null;
  unit: string | null;
};

export type PerenualSpeciesDetails = {
  care_level: string | null;
  common_name: string;
  default_image: { medium_url: string; original_url: string; small_url: string } | null;
  dimensions: PerenualDimensions[] | null;
  growth_rate: string | null;
  id: number;
  poisonous_to_humans: boolean;
  poisonous_to_pets: boolean;
  scientific_name: string[];
  sunlight: string[] | null;
  watering_general_benchmark: { unit: string; value: string } | null;
};

// Pl@ntNet `identify/{project}` response shape (only the fields this app reads).

export type PlantNetCandidate = {
  score: number;
  species: {
    commonNames: string[];
    family: { scientificNameWithoutAuthor: string };
    genus: { scientificNameWithoutAuthor: string };
    scientificNameWithoutAuthor: string;
  };
};

export type PlantNetIdentifyResponse = {
  remainingIdentificationRequests: number;
  results: PlantNetCandidate[];
};

// This app's own resolved/derived types — never sourced directly from a raw API response.

export type PotSizeBucket = 'large' | 'medium' | 'small';
export type RepottingYearsBucket = '1-2' | '2-3' | '3-4';
/** Binary by design (favorites' light-preference tab is framed as "likes light" vs "tolerates
 * shade", not a 3-way split) — see docs/favs-spec.md. */
export type PlantLightNeed = 'bright' | 'low';

export type ResolvedCareFacts = {
  isToxicToPets: boolean;
  lightNeed: PlantLightNeed;
  potSizeRecommendationCm: string;
  repottingScheduleYears: RepottingYearsBucket;
  wateringIntervalDays: number;
};

export type GeneratedSpeciesCopy = {
  category: string;
  description: string;
  wikiArticle: string;
};

export type IdentificationResult =
  | { accepted: true; candidate: PlantNetCandidate }
  | { accepted: false; reason: 'low-confidence' | 'no-candidates' };

// Unsplash `search/photos` response shape (only the fields this app reads).

export type UnsplashPhoto = {
  alt_description: string | null;
  description: string | null;
  urls: { regular: string };
};

export type UnsplashSearchResponse = {
  results: UnsplashPhoto[];
};

// --- Open-Meteo ------------------------------------------------------------

/** A place the forecast can be fetched for, however it was chosen. */
export type GeoLocation = {
  /** Region/state, kept because same-named cities are common ("Springfield"). */
  admin1?: string;
  country: string;
  latitude: number;
  /** Open-Meteo's numeric id, stringified to match how ids are carried elsewhere here. */
  locationId: string;
  longitude: number;
  name: string;
  timezone: string;
};

export type DailyWeather = {
  /** ISO yyyy-mm-dd, in the location's own timezone. */
  date: string;
  /** FAO reference evapotranspiration, mm/day — how fast water leaves soil. Null at grid points
   * where Open-Meteo has no value; callers must drop those rather than average them in. */
  et0: number | null;
  humidityMean: number;
  precipitation: number;
  temperatureMax: number;
};

export type WeatherForecast = {
  days: DailyWeather[];
  fetchedAt: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type OpenMeteoGeocodingResponse = {
  /** Omitted entirely, not empty, when nothing matches. */
  results?: Array<{
    admin1?: string;
    country: string;
    id: number;
    latitude: number;
    longitude: number;
    name: string;
    timezone: string;
  }>;
};

export type OpenMeteoForecastResponse = {
  daily: {
    et0_fao_evapotranspiration: Array<number | null>;
    precipitation_sum: number[];
    relative_humidity_2m_mean: number[];
    temperature_2m_max: number[];
    time: string[];
  };
  latitude: number;
  longitude: number;
  timezone: string;
};
