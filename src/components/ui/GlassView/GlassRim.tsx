import React from 'react';
import { StyleSheet, View, type LayoutRectangle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';

import { sizes, useTheme } from '../../../theme';

const RIM_WIDTH = sizes.border.thin;
const HALF = 2;
// A stroke is centred on its path, so the rect is inset by half the stroke to keep it inside.
const RIM_INSET = RIM_WIDTH / HALF;

/**
 * The Figma glass edge: a 1pt line fading diagonally from full strength (top left) to 40% (bottom
 * right) — white in light, which lifts a white surface off a white-ish background; graphite in
 * dark (`theme.components.glass.edge`).
 *
 * Drawn as an SVG stroke over the surface rather than as a border or a padded gradient wrapper, so
 * it takes no layout space — a 44pt control inside a 44pt surface stays centred.
 */
export function GlassRim({ radius }: { radius: number }) {
  const [layout, setLayout] = React.useState<LayoutRectangle | null>(null);
  const gradientId = React.useId();
  const [edgeStart, edgeEnd] = useTheme().components.glass.edge;
  const stops = React.useMemo(
    () => [parseRgbaStop(edgeStart), parseRgbaStop(edgeEnd)] as const,
    [edgeStart, edgeEnd],
  );

  return (
    <View
      onLayout={event => setLayout(event.nativeEvent.layout)}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}>
      {layout ? (
        <Svg height={layout.height} width={layout.width}>
          <Defs>
            <SvgGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
              <Stop offset="0" stopColor={stops[0].color} stopOpacity={stops[0].opacity} />
              <Stop offset="1" stopColor={stops[1].color} stopOpacity={stops[1].opacity} />
            </SvgGradient>
          </Defs>
          <Rect
            fill="none"
            height={layout.height - RIM_WIDTH}
            // Clamped to the rect: an SVG renderer would otherwise under-round a short pill and the
            // edge would no longer follow the (correctly rounded) surface beneath it.
            rx={Math.min(radius, (layout.width - RIM_WIDTH) / HALF, (layout.height - RIM_WIDTH) / HALF)}
            stroke={`url(#${gradientId})`}
            strokeWidth={RIM_WIDTH}
            width={layout.width - RIM_WIDTH}
            x={RIM_INSET}
            y={RIM_INSET}
          />
        </Svg>
      ) : null}
    </View>
  );
}

/** SVG takes a stop's alpha as a separate `stopOpacity`, so an `rgba()` token is split into its
 * colour and opacity; anything else (a hex start stop) passes through at full opacity. */
function parseRgbaStop(value: string) {
  const match = value.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([01](?:\.\d+)?)\)$/);
  if (!match) return { color: value, opacity: 1 };

  const [, red, green, blue, opacity] = match;

  return { color: `rgb(${red}, ${green}, ${blue})`, opacity: Number(opacity) };
}
