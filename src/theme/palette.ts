/**
 * Every raw colour in the app, and the only file that may hold one (lint enforces it). Themes
 * name these by role; components never see them. Values per docs/dark-mode-spec.md §1.
 */
export const palette = {
  // Warm darks and lights shared by both modes.
  ink: '#2E2B28',
  white: '#FFFFFF',
  green: '#548A5C',
  orange: '#C2531C',

  // Light mode.
  peach: '#FBE5D8',
  cream: '#EDE9E1',
  mist: '#B9C7B2',
  /** What the light glass renders as over the background, sampled from Figma `506:4205`. */
  creamGlass: '#FBF3EC',
  photoUnderlayLight: '#C2C8CA',

  // Dark mode.
  night: '#191814',
  offWhite: '#F3F2F2',
  graphite: '#3C3B3B',
  graphiteEdge: '#424242',
  charcoal: '#242424',
  photoUnderlayDark: '#28292A',
  /** What the dark glass (night at 70%) renders as over the night background. */
  nightGlass: '#1E1D1A',

  // Translucent values, written once each.
  inkMuted: 'rgba(46, 43, 40, 0.6)',
  inkDisabled: 'rgba(46, 43, 40, 0.48)',
  inkRipple: 'rgba(46, 43, 40, 0.12)',
  inkDim: 'rgba(46, 43, 40, 0.18)',
  offWhiteMuted: 'rgba(243, 242, 242, 0.6)',
  offWhiteDisabled: 'rgba(243, 242, 242, 0.48)',
  offWhiteRipple: 'rgba(243, 242, 242, 0.12)',
  whiteGlass: 'rgba(255, 255, 255, 0.5)',
  whiteFrost: 'rgba(255, 255, 255, 0.45)',
  whiteEdgeFaded: 'rgba(255, 255, 255, 0.4)',
  /** 50%, the same density as the light glass (user ruling, 2026-10-03; Figma had 70%). */
  nightGlassFill: 'rgba(25, 24, 20, 0.5)',
  nightFrost: 'rgba(25, 24, 20, 0.45)',
  graphiteEdgeFaded: 'rgba(66, 66, 66, 0.4)',
  blackDim: 'rgba(0, 0, 0, 0.2)',
  blackScrim: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent',
} as const;
