// The native module is unavailable under jest, and every test that renders a screen mounts
// WeatherProvider, which detects a location on mount. Failing the position request routes
// detection down its time-zone fallback, which the weather mock then answers with no matches —
// leaving the app in its "no location yet" state, the unadjusted behaviour tests assert.
module.exports = {
  getCurrentPosition: jest.fn((_success, error) => {
    error?.({ code: 2, message: 'position unavailable in tests' });
  }),
  requestAuthorization: jest.fn((_success, error) => {
    error?.({ code: 1, message: 'permission unavailable in tests' });
  }),
  setRNConfiguration: jest.fn(),
  watchPosition: jest.fn(() => 0),
  clearWatch: jest.fn(),
};
module.exports.default = module.exports;
