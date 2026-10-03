// Single source of truth for raw color values.
const palette = {
  dark:   '#2E2B28',
  green:  '#46764D',
  mist:   '#B9C7B2',
  orange: '#C2531C',
  peach:  '#FBE5D8',
  peachDark: '#F3DED3',
  creamWarm: '#FCF2E6',
  // What the Figma glass actually renders as over the app gradient, sampled from `506:4205`.
  // Android has no glass (Material surfaces are opaque), so this is the colour it shows instead.
  creamGlass: '#FBF3EC',
  cream:  '#EDE9E1',
  white:  '#FFFFFF',
} as const;

export const colors = {
  text: {
    primary:     palette.dark,
    highlighted: palette.green,   // bodyHighlight variant
    placeholder: palette.mist,
    /** Body colour at 60%. What a placeholder or a secondary value reads as against the cream
     * surfaces — `mist` is a cool green-grey that sits wrong next to warm text, and the green
     * `highlighted` reads as a link. */
    muted: 'rgba(46, 43, 40, 0.6)',
    inverse:     palette.white,
  },
  brand: {
    green:  palette.green,
    orange: palette.orange,
    dark:   palette.dark,
  },
  surface: {
    white: palette.white,
    creamWarm: palette.creamWarm,
    peachDark: palette.peachDark,
    glass: 'rgba(255, 255, 255, 0.5)',
    /** The opaque stand-in for `glass` where translucency is not the platform's language. */
    container: palette.creamGlass,
    dark:  palette.dark,
  },
  border: {
    white: palette.white,
  },
  action: {
    primary:  palette.dark,
    success:  palette.green,
    danger:   palette.orange,
    disabled: 'rgba(46, 43, 40, 0.48)',
  },
  icon: {
    primary: palette.dark,
    inverse: palette.white,
    green:   palette.green,
  },
  overlay: {
    dim:   'rgba(46, 43, 40, 0.18)',   // Loader dark overlay
    frost: 'rgba(255, 255, 255, 0.45)', // Loader light overlay
    scrim: 'rgba(0, 0, 0, 0.2)',        // AlertModal backdrop
    // Android press ripple: Material's pressed state layer is the content colour at ~12%.
    ripple: 'rgba(46, 43, 40, 0.12)',
  },
} as const;

export const gradients = {
  appBackground: [palette.peach, palette.cream],
  glassBorder:   ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.4)'],
} as const;
