import React from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';

import { AlertModal } from '../components/ui/AlertModal';
import { BottomActions } from '../components/ui/BottomActions';
import { EditableTitle } from '../components/ui/EditableTitle';
import { NavBar, type NavItem } from '../components/ui/NavBar';
import { Photo } from '../components/ui/Photo';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { TopActions } from '../components/ui/TopActions';
import {
  buildDuplicateNameMessage,
  findDuplicateName,
  usePlantData,
} from '../features/plants/data/PlantDataProvider';
import {
  SCREENS,
  type AddPlantPrefilledScreenProps,
  type RootNavigation,
} from '../navigation';

const PLANT_NAME_MAX_LENGTH = 42;
const CAMERA_ACTION_KEY = 'camera-action';
const SAVE_ACTION_KEY = 'save-action';
type PrefilledActionKey = typeof CAMERA_ACTION_KEY | typeof SAVE_ACTION_KEY;

export function AddPlantPrefilledScreen({
  navigation,
  route,
}: AddPlantPrefilledScreenProps) {
  const rootNavigation = navigation.getParent<RootNavigation>();
  const { getDetectionById, getSpeciesById, ownedPlants, saveDetection } = usePlantData();
  const detection = getDetectionById(route.params?.detectionId);
  const species = getSpeciesById(detection?.speciesId);
  const [customName, setCustomName] = React.useState(detection?.generatedName ?? '');
  const [alertText, setAlertText] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCustomName(detection?.generatedName ?? '');
  }, [detection?.generatedName]);

  const handleSave = React.useCallback(() => {
    if (!detection) {
      setAlertText('Plant could not be saved. Try taking another photo.');
      return;
    }

    const result = saveDetection(detection.detectionId, customName);

    if (result.duplicate) {
      setAlertText(result.message);
      setCustomName(detection.generatedName ?? '');
      return;
    }

    rootNavigation?.replace(SCREENS.PLANT_DETAIL, {
      ownedPlantId: result.ownedPlantId,
    });
  }, [customName, detection, rootNavigation, saveDetection]);
  const handleNameSubmit = React.useCallback((nextName: string) => {
    if (findDuplicateName(nextName, ownedPlants)) {
      setAlertText(buildDuplicateNameMessage(nextName));
      return false;
    }

    setCustomName(nextName);
    return true;
  }, [ownedPlants]);

  const handleSnapAgain = React.useCallback(() => {
    navigation.navigate(SCREENS.ADD_PLANT_CAMERA);
  }, [navigation]);
  const actionItems = React.useMemo<NavItem<PrefilledActionKey>[]>(
    () => [
      {
        accessibilityLabel: 'Snap new photo',
        icon: 'camera',
        key: CAMERA_ACTION_KEY,
        onPress: handleSnapAgain,
      },
      {
        accessibilityLabel: 'Save plant',
        icon: 'check',
        key: SAVE_ACTION_KEY,
        onPress: handleSave,
      },
    ],
    [handleSave, handleSnapAgain],
  );

  if (!detection || !species) {
    return (
      <AlertModal
        onClose={() => navigation.replace(SCREENS.ADD_PLANT_CAMERA)}
        text="Plant detection was not found. Snap a new photo to continue."
        variant="error"
        visible
      />
    );
  }

  return (
    <ScreenLayout
      topActions={(
        <TopActions
          onRightPress={() => navigation.getParent()?.goBack()}
          rightIcon="close"
          rightLabel="Close detected plant"
          title={(
            <EditableTitle
              maxLength={PLANT_NAME_MAX_LENGTH}
              onSubmit={handleNameSubmit}
              value={customName}
            />
          )}
        />
      )}
      bottomActionsOverlay={false}
      bottomActions={(
        <BottomActions
          bottomBar={<NavBar activeKey={SAVE_ACTION_KEY} items={actionItems} />}
        />
      )}>
      <Pressable
        accessible={false}
        onPress={Keyboard.dismiss}
        style={styles.previewImage}>
        <Photo
          resizeMode="cover"
          source={detection.image}
          style={styles.previewImage}
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
  previewImage: {
    flex: 1,
    width: '100%',
  },
});
