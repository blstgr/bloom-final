import React from 'react';
import { StyleSheet } from 'react-native';

import { lightTheme, themes, type Theme, type ThemeMode } from './themes';

// Light by default, so anything rendered outside a provider (tests, a stray preview) still gets a
// complete theme rather than undefined colours.
const ThemeContext = React.createContext<Theme>(lightTheme);

/** Supplies the theme for `mode`. Which mode applies is decided by the app (settings + system), not
 * here, so the theme layer stays independent of the store. */
export function ThemeProvider({ children, mode }: { children: React.ReactNode; mode: ThemeMode }) {
  return <ThemeContext.Provider value={themes[mode]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return React.useContext(ThemeContext);
}

/**
 * Turns a module-level factory into a hook returning its value for the current theme. Each theme's
 * value is built once and cached, so a consumer receives the same object on every render and
 * switching modes swaps between two prebuilt values rather than rebuilding them.
 *
 * For theme-derived values that are not styles (a ripple config); styles use `makeThemedStyles`.
 */
export function makeThemedValue<T>(factory: (theme: Theme) => T) {
  const cache = new Map<Theme, T>();

  return function useThemedValue(): T {
    const theme = useTheme();
    let value = cache.get(theme);
    if (value === undefined) {
      value = factory(theme);
      cache.set(theme, value);
    }

    return value;
  };
}

/**
 * Turns a module-level style factory into a hook returning that component's styles for the
 * current theme, one cached sheet per theme (see `makeThemedValue`).
 *
 * Only colour-bearing styles need to live in a factory; layout-only styles can stay static.
 */
export function makeThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  return makeThemedValue(theme => StyleSheet.create(factory(theme)));
}
