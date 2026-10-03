import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React from 'react';

import { LocationPrompt } from '../features/weather/components/LocationPrompt';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { WaterScreen } from '../screens/WaterScreen';

import { SCREENS } from './constants';
import { FloatingTabBar } from './FloatingTabBar';
import type { RootNavigation, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * One tab bar for the whole navigator, rendered over the screens rather than beside them.
 *
 * It is absolutely positioned (see `FloatingTabBar`) so the frosted glass still composites over
 * scrolling content; screens reserve the matching bottom inset with `ScreenLayout`'s
 * `reserveBottomBarSpace`. Rendering it once — rather than once per screen — is what lets the
 * active-item pill animate between items at all.
 */
function renderFloatingTabBar(props: BottomTabBarProps) {
  return <FloatingTabBar {...props} />;
}

export function TabNavigator() {
  // Navigating to a root-stack screen from here bubbles up through the drawer to the root stack.
  const navigation = useNavigation<RootNavigation>();
  const openCitySearch = React.useCallback(() => {
    navigation.navigate(SCREENS.LOCATION_SEARCH);
  }, [navigation]);

  // The explainer waits until the transition in from sign-in has finished: shown any earlier, the
  // modal lands over the sign-in screen that is still sliding away — the very "asked before
  // arriving" problem it exists to fix. The root stack reports that transition on the route that
  // holds this navigator, one level up from here.
  const [hasArrived, setHasArrived] = React.useState(false);
  React.useEffect(
    () =>
      navigation.getParent<RootNavigation>()?.addListener('transitionEnd', event => {
        if (!event.data.closing) setHasArrived(true);
      }),
    [navigation],
  );

  return (
    <>
    <Tab.Navigator
      // react-native-screens detaching/freezing inactive tabs races with focusing a TextInput
      // on the active one (a keyboard session opens then immediately closes) — see
      // https://github.com/software-mansion/react-native-screens/issues/1342
      detachInactiveScreens={false}
      screenOptions={{
        // bottom-tabs v7 defaults to 'none', so switching tabs cut instantly while the
        // FloatingTabBar pill glided. 'fade' rather than 'shift': the bar is absolutely
        // positioned and rendered once by the navigator, so sliding screens horizontally
        // beneath a stationary bar reads as a glitch.
        animation: 'fade',
        headerShown: false,
      }}
      tabBar={renderFloatingTabBar}>
      <Tab.Screen component={HomeScreen} name={SCREENS.HOME} />
      <Tab.Screen component={LibraryScreen} name={SCREENS.LIBRARY} />
      <Tab.Screen component={WaterScreen} name={SCREENS.WATER} />
      <Tab.Screen component={FavoritesScreen} name={SCREENS.FAVORITES} />
    </Tab.Navigator>
    {/* Here rather than on a screen: it belongs to arriving in the app after sign-in, whichever
        tab that lands on. */}
    {hasArrived ? <LocationPrompt onPickCity={openCitySearch} /> : null}
    </>
  );
}
