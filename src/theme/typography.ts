export const fontFamilies = {
  display:  'CabinetGrotesk-Black',
  body:     'Satoshi-Medium',
  bodyBold: 'Satoshi-Bold',
  /** Button and chip labels (Figma: Satoshi Black). */
  bodyBlack: 'Satoshi-Black',
} as const;

const body = {
  fontFamily: fontFamilies.body,
  fontSize: 17,
  lineHeight: 26,
} as const;

const bodyS = {
  ...body,
  fontFamily: fontFamilies.bodyBold,
  fontSize: 14,
  lineHeight: 21,
} as const;

export const typography = {
  // Display titles — CabinetGrotesk-Black, 4 sizes
  titleXl: { fontFamily: fontFamilies.display, fontSize: 40, lineHeight: 44 },
  titleL:  { fontFamily: fontFamilies.display, fontSize: 32, lineHeight: 36 },
  titleM:  { fontFamily: fontFamilies.display, fontSize: 24, lineHeight: 30 },
  titleS:  { fontFamily: fontFamilies.display, fontSize: 17, lineHeight: 26 },

  // Body copy — Satoshi, 3 variations
  body,
  bodyS,
  button: { ...body, fontFamily: fontFamilies.bodyBlack },
} as const;
