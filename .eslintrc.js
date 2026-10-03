// Folders with a barrel (index.ts) and the internal files that must not be
// imported directly from outside the folder — import from the barrel instead.
const BARREL_INTERNALS = {
  AlertModal: ['AlertModal'],
  AppText: ['AppText'],
  Badge: ['Badge'],
  BadgePill: ['BadgePill'],
  BottomActions: ['BottomActions'],
  Button: ['Button'],
  EditableTitle: ['EditableTitle'],
  EmptyState: ['EmptyState'],
  GlassView: ['GlassView'],
  Icon: ['Icon'],
  Input: ['Input'],
  LocationPrompt: ['LocationPrompt'],
  Loader: ['Loader'],
  Logo: ['Logo'],
  NavBar: ['NavBar', 'NavBarItem'],
  navigation: ['types'],
  Photo: ['Photo'],
  PhotoGrid: ['PhotoGrid'],
  PlantCard: ['PlantCard'],
  PlantDetail: ['PlantDetail'],
  ScreenLayout: ['ScreenLayout'],
  SearchOverlay: ['SearchOverlay', 'useDebouncedSearch'],
  SegmentedBarBase: ['SegmentedBarBase'],
  SettingsPanel: ['SettingsPanel', 'SettingsRow'],
  SlidingIndicator: ['useSlidingIndicator'],
  StartScreenAssets: ['StartScreenAssets'],
  Tabs: ['Tabs'],
  Toggle: ['Toggle'],
  TopActions: ['TopActions'],
  Touchable: ['Touchable'],
  WateringCard: ['WateringCard'],
  WateringSchedule: ['WateringSchedule'],
  WateringSlider: ['WateringSlider'],
};

const noDeepImportPatterns = Object.entries(BARREL_INTERNALS).flatMap(([dir, files]) =>
  files.map(file => ({
    group: [`**/${dir}/${file}`],
    message: `Import from the '${dir}' barrel (its index.ts) instead of '${dir}/${file}' directly.`,
  })),
);

// Colour guardrails (docs/dark-mode-spec.md §4): raw colours live only in src/theme/palette.ts, and
// nothing outside src/theme reaches past the theme to the palette or the theme definitions.
const COLOR_LITERAL = String.raw`/^(#[0-9A-Fa-f]{3,8}|rgba?\(.*\)|hsla?\(.*\))$/`;
const noColorLiterals = [
  {
    selector: `Literal[value=${COLOR_LITERAL}]`,
    message: 'No raw colours outside src/theme — read a token from useTheme() / makeThemedStyles.',
  },
  {
    selector: `TemplateElement[value.raw=${COLOR_LITERAL}]`,
    message: 'No raw colours outside src/theme — read a token from useTheme() / makeThemedStyles.',
  },
];
const noThemeInternals = [
  {
    group: ['**/theme/palette', '**/theme/themes', '**/theme/ThemeProvider'],
    message: "Import from the theme barrel ('theme'); the palette is never imported outside src/theme.",
  },
];

module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['coverage/'],
  plugins: ['import', 'react-native-a11y'],
  rules: {
    // --- Accessibility ---
    // Baseline safety net: every Touchable must carry SOME a11y descriptor
    // (role, label, or accessibilityActions). Satisfied by accessibilityRole
    // alone, so it does NOT catch "icon-only touchable missing a label" —
    // that check has no lint rule and must be done manually each review,
    // same as the orphaned-files criterion below.
    'react-native-a11y/has-valid-accessibility-descriptors': 'error',

    // --- Import ordering ---
    // Catches mid-file imports and enforces: builtins → externals → internals → relatives
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-duplicates': 'error',
    // Catches deep imports when a barrel index.ts exists
    'no-restricted-imports': ['error', { patterns: [...noDeepImportPatterns, ...noThemeInternals] }],
    'no-restricted-syntax': ['error', ...noColorLiterals],

    // --- React ---
    // Catches key={index} on lists where items can reorder or be removed
    'react/no-array-index-key': 'warn',

    // --- TypeScript ---
    // Catches `any` that slips through strict mode
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    {
      // The theme is where colours are defined, so it is the one place literals and its own
      // internals are allowed.
      files: ['src/theme/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { patterns: noDeepImportPatterns }],
        'no-restricted-syntax': 'off',
      },
    },
    {
      // Catches magic numbers in component/screen style & layout code.
      // Exceptions match the project's 9+ rubric: 0, 1, 100, -1.
      // detectObjects is on so StyleSheet.create({...}) values (fontSize, opacity,
      // gap, etc.) are checked too — they're exempt by default because their AST
      // parent is a plain object Property, which is the majority of where magic
      // numbers actually show up in this codebase's UI code.
      // Note: ESLint's no-magic-numbers unconditionally exempts numeric JSX attribute
      // values (e.g. `scrollEventThrottle={16}`) — that's hardcoded in the rule itself
      // (see isJSXNumber in eslint's no-magic-numbers.js) with no option to disable it,
      // so this still won't catch those; needs a custom rule if that gap matters enough
      // to close, it can't be done via config.
      files: [
        'src/components/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
        'src/navigation/**/*.{ts,tsx}',
        'src/screens/**/*.{ts,tsx}',
      ],
      // data/** holds literal domain values (e.g. a species' wateringIntervalDays) —
      // those are content, not unnamed style/layout constants, so they're excluded
      // the same way tests are.
      excludedFiles: ['**/*.test.ts', '**/*.test.tsx', '**/data/**'],
      rules: {
        'no-magic-numbers': [
          'error',
          {
            ignore: [0, 1, -1, 100],
            ignoreArrayIndexes: true,
            detectObjects: true,
            enforceConst: false,
          },
        ],
      },
    },
  ],
};
