import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { CommonActions } from '@react-navigation/native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '../components/ui/ScreenLayout';
import { TopActions } from '../components/ui/TopActions';
import {
  SettingsPanel,
  type SettingsRowProps,
} from '../features/settings/components/SettingsPanel';
import { useWeather } from '../features/weather/WeatherProvider';
import type { GeoLocation } from '../services/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectActiveLocation,
  setAutoDetectLocation,
  setDarkTheme,
  setFollowSystemTheme,
  setWeatherAdjustmentEnabled,
} from '../store/settingsSlice';
import { makeThemedStyles, spacing, useTheme } from '../theme';

import { SCREENS } from './constants';
import { TabNavigator } from './TabNavigator';
import type { RootNavigation, SettingsDrawerParamList } from './types';

const Drawer = createDrawerNavigator<SettingsDrawerParamList>();

function getLocationValue({
  activeLocation,
  autoDetectLocation,
  hasAttemptedDetection,
}: {
  activeLocation: GeoLocation | null;
  autoDetectLocation: boolean;
  hasAttemptedDetection: boolean;
}): string {
  if (activeLocation) return activeLocation.name;
  if (autoDetectLocation && !hasAttemptedDetection) return 'Detecting...';

  return 'Not set';
}

function CustomDrawerContent({ navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { autoDetectLocation, followSystemTheme, weatherAdjustmentEnabled } =
    useAppSelector(state => state.settings);
  // The mode already resolved for the tree (settings + system, in `selectThemeMode`), so the rule
  // and the system appearance are read in one place, not again here.
  const isDark = useTheme().mode === 'dark';
  const activeLocation = useAppSelector(selectActiveLocation);
  const { hasAttemptedDetection } = useWeather();

  const openLocationSearch = () => {
    navigation
      .getParent<RootNavigation>()
      ?.navigate(SCREENS.LOCATION_SEARCH, { currentLocationId: activeLocation?.locationId });
  };

  // Three states, not two: a city, still looking, or looked and came up empty. Collapsing the
  // last two leaves a failed detection showing a progress indicator that never resolves.
  const locationValue = getLocationValue({
    activeLocation,
    autoDetectLocation,
    hasAttemptedDetection,
  });

  const weatherRows: SettingsRowProps[] = [
    {
      label: 'Adjust watering to weather',
      onValueChange: next => dispatch(setWeatherAdjustmentEnabled(next)),
      value: weatherAdjustmentEnabled,
      variant: 'toggle',
    },
  ];

  // The panel collapses to the single switch when the feature is off: the rows below only
  // describe where the weather is read from, which is moot when it is not being read.
  if (weatherAdjustmentEnabled) {
    weatherRows.push(
      {
        label: 'Detect location',
        onValueChange: next => dispatch(setAutoDetectLocation(next)),
        value: autoDetectLocation,
        variant: 'toggle',
      },
      {
        label: 'Your location',
        // Only reachable when the user has taken detection off — otherwise the city is the
        // device's to decide, and tapping it would promise a choice that does not stick.
        onPress: autoDetectLocation ? undefined : openLocationSearch,
        value: locationValue,
        variant: 'navigation',
      },
    );
  }

  // "Dark theme" shows the mode on screen: while following the system that is the appearance being
  // followed rather than the stored choice, which only applies once following is off — a switch
  // reading "off" on a dark screen would contradict what the user is looking at. While following,
  // the mode on screen is the system's, which is what turning following off must keep.
  const themeRows: SettingsRowProps[] = [
    {
      label: 'Follow system theme',
      onValueChange: follow => dispatch(setFollowSystemTheme({ follow, systemIsDark: isDark })),
      value: followSystemTheme,
      variant: 'toggle',
    },
    {
      disabled: followSystemTheme,
      label: 'Dark theme',
      onValueChange: next => dispatch(setDarkTheme(next)),
      value: isDark,
      variant: 'toggle',
    },
  ];

  const handleLogout = () => {
    navigation.getParent()?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: SCREENS.AUTH_START }],
      }),
    );
  };

  return (
    // The drawer has no separate Settings route: the assignment requires Drawer navigation,
    // while the design uses a full-screen settings panel opened from the top-right more button.
    // Keeping settings as custom drawer content preserves that visual model and still enables
    // the drawer gesture through React Navigation.
    // Scrollable: three panels outgrow a smaller phone's height, and the bottom inset keeps the
    // last one clear of the home indicator once scrolled to the end.
    <ScreenLayout
      horizontalPadding
      contentStyle={[styles.drawerContent, { paddingBottom: insets.bottom + spacing.xxl }]}
      scrollableContent
      topActions={(
        <TopActions
          onRightPress={() => navigation.closeDrawer()}
          rightIcon="close"
          rightLabel="Close settings"
        />
      )}>
      <SettingsPanel rows={weatherRows} />
      <SettingsPanel rows={themeRows} />
      <SettingsPanel
        rows={[
          { value: 'plantkiller@gmail.com', variant: 'text' },
          { buttonLabel: 'Log out', onPress: handleLogout, variant: 'buttonOnly' },
        ]}
      />
    </ScreenLayout>
  );
}

export function SettingsDrawerNavigator() {
  const themedStyles = useThemedStyles();

  return (
    <Drawer.Navigator
      drawerContent={CustomDrawerContent}
      screenOptions={{
        drawerPosition: 'right',
        drawerStyle: [styles.drawer, themedStyles.drawer],
        headerShown: false,
      }}>
      <Drawer.Screen component={TabNavigator} name={SCREENS.MAIN_TABS} />
    </Drawer.Navigator>
  );
}

// The screen's own background (flat in dark, the gradient's first stop in light): the settings
// content paints the full gradient over it, so this only shows at the drawer's edge while it slides,
// where a raised-white strip would flash against the dark screen.
const useThemedStyles = makeThemedStyles(theme => ({
  drawer: {
    backgroundColor: theme.colors.background[0],
  },
}));

const styles = StyleSheet.create({
  drawer: {
    width: '100%',
  },
  drawerContent: {
    gap: spacing.xxl,
  },
});
