// Keeps the suite offline. WeatherProvider detects a location on mount, so without this every
// test that renders a screen would reach Open-Meteo. Resolving to no matches leaves the app in
// its "no location yet" state, which is the unadjusted behaviour the existing tests assert.
class WeatherApiError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
    this.name = 'WeatherApiError';
  }
}

module.exports = {
  WeatherApiError,
  getForecast: jest.fn(() => Promise.resolve({
    days: [],
    fetchedAt: new Date(0).toISOString(),
    latitude: 0,
    longitude: 0,
    timezone: 'UTC',
  })),
  // Rejecting keeps the Library grid on its no-location list, the same answer the tests' absent
  // location already produces.
  getLocationClimate: jest.fn(() => Promise.reject(new WeatherApiError('network', 'offline'))),
  reverseGeocode: jest.fn(() => Promise.resolve(null)),
  searchLocations: jest.fn(() => Promise.resolve([])),
};
