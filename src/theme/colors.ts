// Single source of truth for raw color values.
const palette = {
  dark:   '#2E2B28',
  green:  '#46764D',
  mist:   '#B9C7B2',
  orange: '#C2531C',
  peach:  '#FBE5D8',
  peachDark: '#F3DED3',
  creamWarm: '#FCF2E6',
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
    dark:  palette.dark,
  },
  border: {
    white: palette.white,
    // Semi-transparent white border for glass surfaces.
    // Note: RN borderColor is a single value — gradient borders require a LinearGradient mask.
    glass: 'rgba(255, 255, 255, 0.7)',
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
    glass: 'rgba(255, 255, 255, 0.08)', // GlassView background/tint — kept low since the iOS
                                         // system material this layers on already bakes in its
                                         // own opacity; stacking a strong tint on top compounds.
    scrim: 'rgba(0, 0, 0, 0.2)',        // AlertModal backdrop
  },
} as const;

export const gradients = {
  appBackground: [palette.peach, palette.cream],
  glassBorder:   ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.4)'],
} as const;
