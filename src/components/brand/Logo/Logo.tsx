import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

import { sizes, useTheme } from '../../../theme';

export type LogoProps = {
  /** The wordmark; defaults to the theme's `components.logo.word`. */
  color?: string;
  /** The flower marks; defaults to the theme's `components.logo.mark`. */
  markColor?: string;
  width?: number;
};

const dimensions = {
  logo: {
    width: sizes.logo.fullWidth,
    height: sizes.logo.fullHeight,
    viewBox: '0 0 225.759 53.6',
  },
  symbol: {
    width: sizes.logo.symbolWidth,
    height: sizes.logo.symbolHeight,
    viewBox: '0 0 61.4961 53.6',
  },
} as const;

export function Logo({ color, markColor, width }: LogoProps) {
  const logo = useTheme().components.logo;
  const size = dimensions.logo;
  const renderedWidth = width ?? size.width;
  const renderedHeight = (renderedWidth / size.width) * size.height;

  return (
    <Svg
      width={renderedWidth}
      height={renderedHeight}
      viewBox={size.viewBox}
      fill="none">
      <FullLogo color={color ?? logo.word} markColor={markColor ?? logo.mark} />
    </Svg>
  );
}

export function LogoSymbol({ color, markColor, width }: LogoProps) {
  const logo = useTheme().components.logo;
  const size = dimensions.symbol;
  const renderedWidth = width ?? size.width;
  const renderedHeight = (renderedWidth / size.width) * size.height;

  return (
    <Svg
      width={renderedWidth}
      height={renderedHeight}
      viewBox={size.viewBox}
      fill="none">
      <SymbolLogo color={color ?? logo.word} markColor={markColor ?? logo.mark} />
    </Svg>
  );
}

function FullLogo({ color, markColor }: Required<Pick<LogoProps, 'color' | 'markColor'>>) {
  return (
    <G>
      <Path d="M28.4 53.6H0V0H28.64C41.68 0 45.84 6.4 45.84 13.6C45.84 25.04 34.72 26.4 26.8 26.4C42.08 26.4 47.44 31.84 47.44 39.92C47.44 50.48 39.68 53.6 28.4 53.6ZM25.2 12.8H14.4V20.8H25.2C28.64 20.8 30.64 19.68 30.64 16.88C30.64 14 28.64 12.8 25.2 12.8ZM26.4 32H14.4V40.8H26.4C30.88 40.8 32.72 39.28 32.72 36.4C32.72 33.44 30.88 32 26.4 32Z" fill={color} />
      <Path d="M66.6656 53.6H52.2656V0H66.6656V53.6Z" fill={color} />
      <Path d="M177.759 53.6H163.359V14.08H177.759V25.76C178.799 19.2 181.999 13.28 190.719 13.28C197.599 13.28 201.759 17.84 201.759 25.76C202.799 19.2 205.999 13.28 214.719 13.28C221.599 13.28 225.759 17.84 225.759 25.92V53.6H211.359V31.52C211.359 26.72 210.479 24.16 206.559 24.16C202.799 24.16 201.759 25.68 201.759 32.08V53.6H187.359V31.52C187.359 26.72 186.479 24.16 182.559 24.16C178.799 24.16 177.759 25.68 177.759 32.08V53.6Z" fill={color} />
      <Path d="M105.608 41.983C111.462 40.4146 114.955 34.3643 113.386 28.5108C112.424 24.9176 109.778 22.2308 106.517 21.0339C108.743 18.367 109.691 14.7174 108.728 11.1242C107.968 8.30913 106.124 5.90993 103.598 4.45205C101.073 2.99417 98.0733 2.59644 95.2555 3.34599C91.6623 4.3088 88.9755 6.95435 87.7787 10.2152C85.1118 7.98962 81.4621 7.04193 77.8689 8.00473C72.0154 9.57318 68.5223 15.6234 70.0907 21.4769C71.0535 25.0702 73.6991 27.757 76.9599 28.9538C74.7343 31.6207 73.7866 35.2703 74.7494 38.8636C76.3179 44.7171 82.3681 48.2102 88.2216 46.6418C91.8149 45.679 94.5017 43.0334 95.6985 39.7725C98.3654 41.9981 102.015 42.9458 105.608 41.983ZM84.0112 27.0644C82.8672 22.795 85.3986 18.4104 89.668 17.2665C93.9374 16.1225 98.322 18.6539 99.466 22.9233C100.61 27.1927 98.0785 31.5773 93.8091 32.7213C89.5398 33.8653 85.1552 31.3338 84.0112 27.0644Z" fill={markColor} />
      <Path d="M158.277 24.6C158.277 18.54 153.337 13.6 147.277 13.6C143.557 13.6 140.277 15.46 138.277 18.3C136.277 15.46 132.997 13.6 129.277 13.6C126.361 13.6053 123.566 14.7659 121.504 16.8277C119.442 18.8894 118.282 21.6842 118.277 24.6C118.277 28.32 120.137 31.6 122.977 33.6C120.137 35.6 118.277 38.88 118.277 42.6C118.277 48.66 123.217 53.6 129.277 53.6C132.997 53.6 136.277 51.74 138.277 48.9C140.277 51.74 143.557 53.6 147.277 53.6C153.337 53.6 158.277 48.66 158.277 42.6C158.277 38.88 156.417 35.6 153.577 33.6C156.417 31.6 158.277 28.32 158.277 24.6ZM138.277 41.6C133.857 41.6 130.277 38.02 130.277 33.6C130.277 29.18 133.857 25.6 138.277 25.6C142.697 25.6 146.277 29.18 146.277 33.6C146.277 38.02 142.697 41.6 138.277 41.6Z" fill={markColor} />
    </G>
  );
}

function SymbolLogo({ color, markColor }: Required<Pick<LogoProps, 'color' | 'markColor'>>) {
  return (
    <G>
      <Path d="M14.4 53.6H0V0H14.4V53.6Z" fill={color} />
      <Path d="M53.3427 41.983C59.1962 40.4146 62.6893 34.3643 61.1208 28.5108C60.158 24.9176 57.5125 22.2308 54.2516 21.0339C56.4772 18.367 57.4249 14.7174 56.4621 11.1242C55.7023 8.30913 53.8579 5.90993 51.3328 4.45205C48.8077 2.99417 45.8077 2.59644 42.9899 3.34599C39.3967 4.3088 36.7098 6.95435 35.513 10.2152C32.8461 7.98962 29.1965 7.04193 25.6032 8.00473C19.7497 9.57318 16.2566 15.6234 17.8251 21.4769C18.7879 25.0702 21.4334 27.757 24.6943 28.9538C22.4687 31.6207 21.521 35.2703 22.4838 38.8636C24.0523 44.7171 30.1025 48.2102 35.956 46.6418C39.5493 45.679 42.2361 43.0334 43.4329 39.7725C46.0998 41.9981 49.7494 42.9458 53.3427 41.983ZM31.7456 27.0644C30.6016 22.795 33.133 18.4104 37.4024 17.2665C41.6718 16.1225 46.0564 18.6539 47.2004 22.9233C48.3444 27.1927 45.8129 31.5773 41.5435 32.7213C37.2741 33.8653 32.8895 31.3338 31.7456 27.0644Z" fill={markColor} />
    </G>
  );
}
