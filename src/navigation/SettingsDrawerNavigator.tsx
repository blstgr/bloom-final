import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { CommonActions } from '@react-navigation/native';
import React from 'react';
import { StyleSheet } from 'react-native';

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
  setWeatherAdjustmentEnabled,
} from '../store/settingsSlice';
import { colors, spacing } from '../theme';

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
  const dispatch = useAppDispatch();
  const { autoDetectLocation, weatherAdjustmentEnabled } = useAppSelector(state => state.settings);
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
    <ScreenLayout
      horizontalPadding
      contentStyle={styles.drawerContent}
      topActions={(
        <TopActions
          onRightPress={() => navigation.closeDrawer()}
          rightIcon="close"
          rightLabel="Close settings"
        />
      )}>
      <SettingsPanel rows={weatherRows} />
      <SettingsPanel
        rows={[
          { label: 'Email', value: 'plantkiller@gmail.com', variant: 'textWithLabel' },
          { buttonLabel: 'Log out', onPress: handleLogout, variant: 'buttonOnly' },
        ]}
      />
    </ScreenLayout>
  );
}

export function SettingsDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={CustomDrawerContent}
      screenOptions={{
        drawerPosition: 'right',
        drawerStyle: styles.drawer,
        headerShown: false,
      }}>
      <Drawer.Screen component={TabNavigator} name={SCREENS.MAIN_TABS} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: colors.surface.white,
    width: '100%',
  },
  drawerContent: {
    gap: spacing.xxl,
  },
});
