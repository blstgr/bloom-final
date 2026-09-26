module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/asyncStorageMock.js',
    '^@react-native-community/geolocation$': '<rootDir>/__mocks__/geolocationMock.js',
    '^@react-native-community/blur$': '<rootDir>/__mocks__/reactNativeBlurMock.js',
    '^react-native-image-picker$': '<rootDir>/__mocks__/reactNativeImagePickerMock.js',
    '^react-native-linear-gradient$': '<rootDir>/__mocks__/reactNativeLinearGradientMock.js',
    '^react-native-reanimated$': '<rootDir>/__mocks__/reactNativeReanimatedMock.js',
    // Path-qualified so src/services/weatherApi.test.ts, which imports './weatherApi', still
    // exercises the real client.
    '.*/services/weatherApi$': '<rootDir>/__mocks__/weatherApiMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-drawer-layout|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|react-native-worklets|immer|react-redux)/)',
  ],
};
