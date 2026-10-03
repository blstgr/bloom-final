export const sizes = {
  border: {
    thin: 1,
  },
  logo: {
    fullWidth:    225,
    fullHeight:   53,
    symbolWidth:  61,
    symbolHeight: 53,
  },
  icon: {
    sm:  16,
    md:  24,
    lg:  32,
    xl:  52,
    xxl: 76,
  },
  button: {
    small:   44,
    default: 64,
  },
  nav: {
    item:        64,
    badge:       24,
    badgeOffset: 2,
  },
  badge: {
    md:   32,
    pill: 48,
  },
  input: {
    height: 44,
    /** A trailing action's slot: wider than tall, per Figma (`506:4569`), so the icon sits in a
     * comfortable target at the pill's rounded end. */
    actionWidth: 64,
  },
  modal: {
    maxWidth: 284,
  },
} as const;
