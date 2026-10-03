import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { Provider as StoreProvider } from 'react-redux';

import { PlantDataProvider } from '../features/plants/data/PlantDataProvider';
import { WeatherProvider } from '../features/weather/WeatherProvider';
import { AuthStartScreen } from '../screens/AuthStartScreen';
import { LocationSearchScreen } from '../screens/LocationSearchScreen';
import { PlantDetailScreen } from '../screens/PlantDetailScreen';
import { PlantSearchScreen } from '../screens/PlantSearchScreen';
import { SpeciesInfoScreen } from '../screens/SpeciesInfoScreen';
import { useAppSelector } from '../store/hooks';
import { selectThemeMode } from '../store/settingsSlice';
import { hydrateStore, store } from '../store/store';
import { ThemeProvider, useTheme } from '../theme';

import { AddPlantStackNavigator } from './AddPlantStackNavigator';
import { SCREENS } from './constants';
import { SettingsDrawerNavigator } from './SettingsDrawerNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const SEARCH_SCREEN_OPTIONS = { animation: 'fade' } as const;

export function RootNavigator() {
  // Restores saved favorites and settings once, on launch. Deliberately not awaited before
  // rendering: the first screen is the auth screen, which reads neither, so blocking the tree on
  // a disk read would only add a blank frame.
  React.useEffect(() => {
    hydrateStore();
  }, []);

  return (
    <StoreProvider store={store}>
      <ThemedRoot>
      <PlantDataProvider>
        {/* Reads the settings slice, so it sits inside StoreProvider; independent of plant data. */}
        <WeatherProvider>
        <ThemedNavigationContainer>
          <Stack.Navigator
            // Explicit rather than per-platform default, so Android matches iOS's slide.
            screenOptions={{ animation: 'slide_from_right', headerShown: false }}>
            <Stack.Screen component={AuthStartScreen} name={SCREENS.AUTH_START} />
            <Stack.Screen
              component={SettingsDrawerNavigator}
              name={SCREENS.SETTINGS_DRAWER}
            />
            <Stack.Screen
              component={AddPlantStackNavigator}
              name={SCREENS.ADD_PLANT_STACK}
            />
            <Stack.Screen
              component={PlantDetailScreen}
              name={SCREENS.PLANT_DETAIL}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              component={SpeciesInfoScreen}
              name={SCREENS.SPECIES_INFO}
              options={{ gestureEnabled: false }}
            />
            {/* Fade rather than slide: entering search reads as the trigger turning into the
                focused field, not as navigating to a new page (docs/search-spec.md §1.1). */}
            <Stack.Screen
              component={PlantSearchScreen}
              name={SCREENS.PLANT_SEARCH}
              options={SEARCH_SCREEN_OPTIONS}
            />
            <Stack.Screen
              component={LocationSearchScreen}
              name={SCREENS.LOCATION_SEARCH}
              options={SEARCH_SCREEN_OPTIONS}
            />
          </Stack.Navigator>
        </ThemedNavigationContainer>
        </WeatherProvider>
      </PlantDataProvider>
      </ThemedRoot>
    </StoreProvider>
  );
}

/**
 * Resolves the theme from the user's choice and the system appearance, and applies it to the
 * whole tree and the status bar. Inside the store provider because the choice lives in settings.
 */
function ThemedRoot({ children }: { children: React.ReactNode }) {
  const systemIsDark = useColorScheme() === 'dark';
  const mode = useAppSelector(state => selectThemeMode(state, systemIsDark));

  return (
    <ThemeProvider mode={mode}>
      <ThemedStatusBar />
      {children}
    </ThemeProvider>
  );
}

/** The status bar reads the theme like any other consumer, rather than looking the mode up beside
 * the provider. */
function ThemedStatusBar() {
  return <StatusBar barStyle={useTheme().components.statusBar} />;
}

/**
 * React Navigation paints scene and container backgrounds from its own theme, which defaults to a
 * light grey. Derived from the app theme so nothing light shows through in dark — during a
 * transition or the search fade, before a screen has painted its own background.
 */
function ThemedNavigationContainer({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const navigationTheme = React.useMemo<NavigationTheme>(() => {
    const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: { ...base.colors, background: theme.colors.background[0] },
    };
  }, [theme]);

  return <NavigationContainer theme={navigationTheme}>{children}</NavigationContainer>;
}
