import React from 'react';
import { Platform } from 'react-native';

import { AlertModal } from '../../../../components/ui/AlertModal';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { answerLocationPrompt, selectIsSettingsHydrated } from '../../../../store/settingsSlice';

export type LocationPromptProps = {
  /** Opens city search — the alternative to sharing the device's location. */
  onPickCity: () => void;
};

/**
 * The location question, asked once right after sign-in (docs/search-spec.md §8). Weather-adjusted
 * watering is on by default, so the question belongs at the start.
 *
 * - iOS: the system dialog alone. It already carries the reason (`NSLocationWhenInUseUsageDescription`),
 *   so this answers "allow" on arrival, which lets WeatherProvider detect and raise that dialog.
 * - Android: its dialog cannot say why, so an explainer comes first. "Allow" lets WeatherProvider
 *   detect, which raises the system dialog; "Pick a city" turns detection off and opens city search.
 */
export function LocationPrompt({ onPickCity }: LocationPromptProps) {
  const dispatch = useAppDispatch();
  const isHydrated = useAppSelector(selectIsSettingsHydrated);
  const hasAnswered = useAppSelector(state => state.settings.hasAnsweredLocationPrompt);

  const allow = React.useCallback(() => {
    dispatch(answerLocationPrompt({ allowDetection: true }));
  }, [dispatch]);
  const shouldAsk = isHydrated && !hasAnswered;
  React.useEffect(() => {
    if (Platform.OS === 'ios' && shouldAsk) allow();
  }, [allow, shouldAsk]);

  const pickCity = React.useCallback(() => {
    dispatch(answerLocationPrompt({ allowDetection: false }));
    onPickCity();
  }, [dispatch, onPickCity]);

  return (
    <AlertModal
      actionLabel="Allow location"
      // No `onClose`: a backdrop tap or Android back does nothing, so the question is answered
      // with one of the two choices rather than silently decided either way.
      onAction={allow}
      secondaryAction={{ label: 'Pick a city instead', onPress: pickCity }}
      text="Bloom checks the weather where your plants live, so a hot week means earlier reminders and a rainy one means later."
      title="Water smarter, not more"
      variant="weather"
      // Waits for hydration: before it, `hasAnswered` is the default false even for someone who
      // answered last week.
      visible={Platform.OS === 'android' && shouldAsk}
    />
  );
}
