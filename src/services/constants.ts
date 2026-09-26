export const PERENUAL_BASE_URL = 'https://perenual.com/api/v2';
export const PLANTNET_BASE_URL = 'https://my-api.plantnet.org/v2';
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
export const UNSPLASH_BASE_URL = 'https://api.unsplash.com';
// Open-Meteo needs no API key at all, which is why it is the one service here with nothing in
// config.ts. Forecast and geocoding live on separate hosts.
export const OPEN_METEO_FORECAST_BASE_URL = 'https://api.open-meteo.com/v1';
export const OPEN_METEO_GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1';

// Perenual's own "upgrade to see this image" placeholder — never shown to users as if it were a
// real species photo.
export const PERENUAL_UPGRADE_PLACEHOLDER_MARKER = 'upgrade_access';

// 'all' covers Pl@ntNet's general worldwide flora project (not a specific region/family).
export const PLANTNET_PROJECT = 'all';

// Calibrate against a labeled photo test set before shipping — see docs/api-dev-plan.md's
// step-by-step tuning procedure. Conservative placeholders until then.
export const PLANTNET_MIN_CONFIDENCE_SCORE = 0.3;
export const PLANTNET_MIN_SCORE_GAP = 0.1;
