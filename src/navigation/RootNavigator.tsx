import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Provider as StoreProvider } from 'react-redux';

import { PlantDataProvider } from '../features/plants/data/PlantDataProvider';
import { AuthStartScreen } from '../screens/AuthStartScreen';
import { PlantDetailScreen } from '../screens/PlantDetailScreen';
import { SpeciesInfoScreen } from '../screens/SpeciesInfoScreen';
import { store } from '../store/store';

import { AddPlantStackNavigator } from './AddPlantStackNavigator';
import { SCREENS } from './constants';
import { SettingsDrawerNavigator } from './SettingsDrawerNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <StoreProvider store={store}>
      <PlantDataProvider>
        <NavigationContainer>
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
          </Stack.Navigator>
        </NavigationContainer>
      </PlantDataProvider>
    </StoreProvider>
  );
}
