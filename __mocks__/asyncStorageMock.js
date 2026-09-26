// An in-memory stand-in for the native module. v3 of async-storage ships no jest mock of its own,
// and the real module needs the native side. Backing it with a Map rather than no-op spies means
// persistence tests can assert an actual round trip: write, reload, read the same value back.
const store = new Map();

module.exports = {
  __reset: () => store.clear(),
  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
  getItem: jest.fn(key => Promise.resolve(store.has(key) ? store.get(key) : null)),
  removeItem: jest.fn(key => {
    store.delete(key);
    return Promise.resolve();
  }),
  setItem: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
};
module.exports.default = module.exports;
