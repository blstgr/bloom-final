import React from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';

import { AlertModal } from '../components/ui/AlertModal';
import { BottomActions } from '../components/ui/BottomActions';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { TopActions } from '../components/ui/TopActions';
import { PlantDetail } from '../features/plants/components/PlantDetail';
import { usePlantData } from '../features/plants/data/PlantDataProvider';
import { buildPlantSchedule, isWateredToday, isWateringTooSoon } from '../features/plants/data/schedule';
import { WateringSchedule } from '../features/watering/components/WateringSchedule';
import { WateringSlider } from '../features/watering/components/WateringSlider';
import { useEffectiveWateringInterval } from '../features/weather/useEffectiveWateringInterval';
import { SCREENS, type PlantDetailScreenProps } from '../navigation';

const TOO_SOON_ALERT_TEXT = 'Uh no… you overwater me';
const PLANT_NAME_MAX_LENGTH = 42;
const UNDO_RECONFIRM_WINDOW_MS = 3000;

export function PlantDetailScreen({ navigation, route }: PlantDetailScreenProps) {
  const {
    deleteOwnedPlant,
    getOwnedPlantById,
    getSpeciesById,
    markWatered,
    renameOwnedPlant,
    unmarkWatered,
  } = usePlantData();
  const ownedPlant = getOwnedPlantById(route.params?.ownedPlantId);
  const species = getSpeciesById(ownedPlant?.speciesId);
  // Called before the early return below: hooks cannot live behind a conditional.
  const getEffectiveInterval = useEffectiveWateringInterval();
  const [alertText, setAlertText] = React.useState<string | null>(null);
  // Bumped to force-remount WateringSlider back to its unchecked visual after a rejected attempt.
  const [sliderResetKey, setSliderResetKey] = React.useState(0);
  // Short-lived bypass only for immediately re-confirming the same watering after undo.
  const undoReconfirmUntilRef = React.useRef(0);
  const handleCloseError = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.replace(SCREENS.SETTINGS_DRAWER, {
      params: { screen: SCREENS.HOME },
      screen: SCREENS.MAIN_TABS,
    });
  }, [navigation]);

  if (!ownedPlant || !species) {
    return (
      <AlertModal
        onClose={handleCloseError}
        text="Plant details could not be opened because no saved plant was selected."
        variant="error"
        visible
      />
    );
  }

  const intervalDays = getEffectiveInterval(species);
  const schedule = buildPlantSchedule(ownedPlant, species, undefined, intervalDays);
  const wateringState = isWateredToday(ownedPlant) ? 'completed' : undefined;

  const handleCompleteWatering = () => {
    const canReconfirmUndo = Date.now() <= undoReconfirmUntilRef.current;
    undoReconfirmUntilRef.current = 0;

    if (!canReconfirmUndo && isWateringTooSoon(ownedPlant, species, undefined, intervalDays)) {
      setAlertText(TOO_SOON_ALERT_TEXT);
      setSliderResetKey(key => key + 1);
      return;
    }
    markWatered(ownedPlant.ownedPlantId);
  };

  const handleUndoWatering = () => {
    undoReconfirmUntilRef.current = Date.now() + UNDO_RECONFIRM_WINDOW_MS;
    unmarkWatered(ownedPlant.ownedPlantId);
  };

  const handleNameSubmit = (nextName: string) => {
    const result = renameOwnedPlant(ownedPlant.ownedPlantId, nextName);
    if (result.duplicate) {
      setAlertText(result.message);
      return false;
    }
    return true;
  };

  const handleDeletePlant = () => {
    deleteOwnedPlant(ownedPlant.ownedPlantId);
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(SCREENS.SETTINGS_DRAWER, {
      params: { screen: SCREENS.HOME },
      screen: SCREENS.MAIN_TABS,
    });
  };

  return (
    <ScreenLayout
      topActions={(
        <TopActions
          leftIcon="trash"
          leftLabel="Delete plant"
          onLeftPress={handleDeletePlant}
          onRightPress={() => navigation.goBack()}
          rightIcon="close"
          rightLabel="Back"
        />
      )}
      topActionsOverlay
      bottomActionsOverlay={false}
      bottomActions={(
        <BottomActions
          bottomBar={(
            <WateringSlider
              key={sliderResetKey}
              initialState={wateringState}
              onComplete={handleCompleteWatering}
              onUndo={handleUndoWatering}
            />
          )}
        />
      )}>
      <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.content}>
        <PlantDetail
          category={species.category}
          description={species.description}
          image={ownedPlant.image}
          name={ownedPlant.customName}
          nameMaxLength={PLANT_NAME_MAX_LENGTH}
          onNameSubmit={handleNameSubmit}
          schedule={<WateringSchedule items={schedule} />}
        />
      </Pressable>
      {alertText ? (
        <AlertModal
          onClose={() => setAlertText(null)}
          text={alertText}
          variant="error"
          visible
        />
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
