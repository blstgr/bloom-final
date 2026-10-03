import { darkTheme, lightTheme, type Theme } from './themes';

/** WCAG relative luminance of an opaque hex or an rgba() composited over `backdrop`. */
function luminance(color: string, backdrop = '#000000'): number {
  const [r, g, b] = toRgb(color, backdrop).map(channel => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toRgb(color: string, backdrop: string): [number, number, number] {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    return [0, 2, 4].map(offset => parseInt(hex[1].slice(offset, offset + 2), 16)) as [number, number, number];
  }
  const rgba = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (!rgba) throw new Error(`Unparseable colour ${color}`);
  const alpha = rgba[4] === undefined ? 1 : Number(rgba[4]);
  const base = toRgb(backdrop, '#000000');

  return [1, 2, 3].map((index, i) => Number(rgba[index]) * alpha + base[i] * (1 - alpha)) as [number, number, number];
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground, background);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];

  return (light + 0.05) / (dark + 0.05);
}

const AA_BODY = 4.5;
const AA_LARGE_OR_UI = 3;

describe.each([
  ['light', lightTheme],
  ['dark', darkTheme],
] as Array<[string, Theme]>)('%s theme contrast', (_mode, theme) => {
  const backgrounds = theme.colors.background;

  it('body text reads on the screen background', () => {
    backgrounds.forEach(background => {
      expect(contrast(theme.colors.text.primary, background)).toBeGreaterThanOrEqual(AA_BODY);
    });
  });

  it('body text reads on raised surfaces', () => {
    expect(contrast(theme.colors.text.primary, theme.colors.raised)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it('labels read on the accent fill', () => {
    expect(contrast(theme.colors.text.onAccent, theme.colors.accent)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it('icons read on the opaque glass', () => {
    expect(contrast(theme.colors.icon.primary, theme.components.glass.opaque)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
  });

  // Secondary copy is held to 3:1, not body AA (docs/dark-mode-spec.md §4, user ruling 2026-10-03):
  // muted text, the green highlight and error text are the designer's colours, used for short or
  // secondary text, and lifting them to 4.5:1 would visibly change the palette.
  it.each([
    ['muted', (t: Theme) => t.colors.text.muted],
    ['highlighted', (t: Theme) => t.colors.text.highlighted],
    ['danger', (t: Theme) => t.colors.danger],
  ])('%s text meets 3:1 on every background', (_role, pick) => {
    [...backgrounds, theme.colors.raised].forEach(background => {
      expect(contrast(pick(theme), background)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    });
  });

  it('badge content reads on its badge', () => {
    const { badge } = theme.components;
    expect(contrast(badge.lightContent, badge.light)).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrast(badge.darkContent, badge.dark)).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrast(badge.countLabel, badge.count)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
  });
});
