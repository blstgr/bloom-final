import { palette } from './palette';

export type ThemeMode = 'light' | 'dark';

/**
 * Everything colour-bearing a component may read, by role (docs/dark-mode-spec.md §1).
 *
 * Two layers: `colors` are semantic roles, `components` are per-component roles built from them.
 * A component reads its own entry under `components` first, then a semantic role. The two themes
 * share this one type, so dark cannot omit anything light defines — that fails to compile.
 */
export type Theme = {
  mode: ThemeMode;
  colors: {
    background: readonly [string, string];
    text: {
      primary: string;
      muted: string;
      disabled: string;
      /** Text on the accent fill (primary button, active chip). */
      onAccent: string;
      highlighted: string;
      /** Placeholder in an editable title. */
      placeholder: string;
    };
    icon: {
      primary: string;
      onAccent: string;
      /** An icon in a disabled control (an input's leading icon or action). */
      disabled: string;
      success: string;
    };
    /** The active fill: primary button, active nav item, active chip, slider thumb. */
    accent: string;
    success: string;
    danger: string;
    /** Opaque raised surface: settings rows, editable title field. */
    raised: string;
    ripple: string;
    scrim: string;
  };
  components: {
    glass: {
      fill: string;
      /** The opaque stand-in for `fill` on Android, which has no translucent surfaces. */
      opaque: string;
      /** The rim's gradient, start to end (100% to 40%). */
      edge: readonly [string, string];
      /** Which appearance iOS Liquid Glass renders in. */
      liquidScheme: ThemeMode;
    };
    /** The count badge and the dark badge keep their own colours; the light badge is glass. */
    badge: {
      count: string;
      countLabel: string;
      dark: string;
      darkContent: string;
    };
    photo: {
      underlay: string;
      opacity: number;
    };
    toggle: {
      trackOff: string;
      trackOn: string;
      thumb: string;
    };
    loader: {
      dim: string;
      frost: string;
    };
    favorite: string;
    /** The alert card: the dark ink card with white content in light, a raised card in dark. */
    modal: {
      card: string;
      content: string;
    };
    logo: {
      word: string;
      mark: string;
    };
    statusBar: 'dark-content' | 'light-content';
  };
};

const LIGHT_PHOTO_OPACITY = 1;
const DARK_PHOTO_OPACITY = 0.85;

type ModeSpecificComponents = Pick<Theme['components'], 'glass' | 'loader' | 'photo' | 'statusBar'>;

/**
 * The component layer, built from the semantic one (docs/dark-mode-spec.md §1): a component role
 * that means a semantic role is derived from it, so changing the accent once moves every pill,
 * toggle and badge with it. Only what genuinely differs per mode is passed in, and what a design
 * fixes in both modes (badge circles on photos, the modal) is written once here.
 */
function buildComponents(colors: Theme['colors'], specific: ModeSpecificComponents): Theme['components'] {
  return {
    ...specific,
    badge: {
      count: colors.danger,
      countLabel: palette.white,
      dark: colors.accent,
      darkContent: palette.white,
    },
    favorite: colors.danger,
    logo: { mark: colors.success, word: colors.text.primary },
    // Fixed in both modes: the modal keeps its light look (user ruling, 2026-10-03) and renders
    // its content under the light theme.
    modal: { card: palette.ink, content: palette.white },
    toggle: { thumb: palette.white, trackOff: colors.accent, trackOn: colors.success },
  };
}

const lightColors: Theme['colors'] = {
  background: [palette.peach, palette.cream],
  text: {
    primary: palette.ink,
    muted: palette.inkMuted,
    disabled: palette.inkDisabled,
    onAccent: palette.white,
    highlighted: palette.green,
    placeholder: palette.mist,
  },
  icon: {
    primary: palette.ink,
    onAccent: palette.white,
    disabled: palette.inkDisabled,
    success: palette.green,
  },
  accent: palette.ink,
  success: palette.green,
  danger: palette.orange,
  raised: palette.white,
  ripple: palette.inkRipple,
  scrim: palette.blackDim,
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  components: buildComponents(lightColors, {
    glass: {
      fill: palette.whiteGlass,
      opaque: palette.creamGlass,
      edge: [palette.white, palette.whiteEdgeFaded],
      liquidScheme: 'light',
    },
    loader: { dim: palette.inkDim, frost: palette.whiteFrost },
    photo: { opacity: LIGHT_PHOTO_OPACITY, underlay: palette.photoUnderlayLight },
    statusBar: 'dark-content',
  }),
};

const darkColors: Theme['colors'] = {
  background: [palette.night, palette.night],
  text: {
    primary: palette.offWhite,
    muted: palette.offWhiteMuted,
    disabled: palette.offWhiteDisabled,
    onAccent: palette.offWhite,
    highlighted: palette.green,
    placeholder: palette.offWhiteMuted,
  },
  icon: {
    primary: palette.offWhite,
    onAccent: palette.offWhite,
    disabled: palette.offWhiteDisabled,
    success: palette.green,
  },
  accent: palette.graphite,
  success: palette.green,
  danger: palette.orange,
  raised: palette.charcoal,
  ripple: palette.offWhiteRipple,
  scrim: palette.blackScrim,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  components: buildComponents(darkColors, {
    glass: {
      fill: palette.nightGlassFill,
      opaque: palette.nightGlass,
      edge: [palette.graphiteEdge, palette.graphiteEdgeFaded],
      liquidScheme: 'dark',
    },
    loader: { dim: palette.blackDim, frost: palette.nightFrost },
    photo: { opacity: DARK_PHOTO_OPACITY, underlay: palette.photoUnderlayDark },
    statusBar: 'light-content',
  }),
};

export const themes: Record<ThemeMode, Theme> = { dark: darkTheme, light: lightTheme };
