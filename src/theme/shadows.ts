const figmaSoftShadow = '0px 8px 24px -2px rgba(43, 38, 31, 0.08)';

/**
 * The Figma soft shadow, on both platforms. Android draws CSS-style box shadows too (New
 * Architecture), so it gets the designed shadow rather than Material's harder elevation shadow
 * (user review, 2026-10-03).
 *
 * Goes on an unclipped wrapper: a surface clips to its pill shape, and a shadow on a clipping view
 * is clipped with it.
 */
export const shadows = {
  soft: {
    boxShadow: figmaSoftShadow,
  },
} as const;
