import React from 'react';
import { Image, Linking, StyleSheet } from 'react-native';
import { launchCamera } from 'react-native-image-picker';

import { AlertModal } from '../components/ui/AlertModal';
import { BottomActions } from '../components/ui/BottomActions';
import { Button } from '../components/ui/Button';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { TopActions } from '../components/ui/TopActions';
import { mockSpecies } from '../features/plants/data/mockPlants';
import { usePlantData } from '../features/plants/data/PlantDataProvider';
import { SCREENS, type AddPlantCameraScreenProps } from '../navigation';
import { sizes } from '../theme';

const CAMERA_CAPTURE_QUALITY = 0.8;
// Full sensor resolution (often 3000-4000px) is wasted upload size for both plant-ID inference
// and this app's own display sizes (grid tiles, article hero) — none of them need more than a
// retina-sharp image. Capping here shrinks the identify upload, the single slowest call in the
// resolution pipeline, without any visible quality loss.
const CAMERA_CAPTURE_MAX_DIMENSION = 1280;
// Temporary dev/simulator mock user capture: iOS Simulator has no real camera, but the
// add/search camera flow still needs to remain navigable. A real photo-library picker (task:
// simulator photo picker) will replace this later — for now, picking a random bundled species
// photo per screen visit at least exercises identification against more than one fixed image.
// Remove this fallback for release once real device capture is the only supported path.
const SIMULATOR_FALLBACK_IMAGES = mockSpecies.map(species => species.detailImage);

function pickRandomSimulatorImage() {
  const index = Math.floor(Math.random() * SIMULATOR_FALLBACK_IMAGES.length);
  return SIMULATOR_FALLBACK_IMAGES[index];
}

const CAMERA_UNAVAILABLE_ERROR_CODE = 'camera_unavailable';
const CAMERA_PERMISSION_ERROR_CODE = 'permission';
const PERMISSION_ALERT_TEXT = 'Camera access needed to identify your plants.';
const PERMISSION_ACTION_LABEL = 'Open settings';

export function AddPlantCameraScreen({ navigation, route }: AddPlantCameraScreenProps) {
  const { createDetection } = usePlantData();
  const mode = route.params?.mode;
  const [alertText, setAlertText] = React.useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = React.useState(false);
  const [capturing, setCapturing] = React.useState(false);
  const capturingRef = React.useRef(false);
  // Picked once per screen visit so the fallback preview and the eventually-"captured" photo
  // (if the real camera is unavailable) always match each other.
  const [simulatorFallbackImage] = React.useState(pickRandomSimulatorImage);

  const continueWithImage = React.useCallback((image: Parameters<typeof createDetection>[0]) => {
    const detection = createDetection(image);
    navigation.navigate(SCREENS.ADD_PLANT_LOADER, {
      captureId: detection.detectionId,
      mode,
    });
  }, [createDetection, mode, navigation]);

  const handleCapture = React.useCallback(async () => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    setCapturing(true);

    let result;
    try {
      result = await launchCamera({
        cameraType: 'back',
        maxHeight: CAMERA_CAPTURE_MAX_DIMENSION,
        maxWidth: CAMERA_CAPTURE_MAX_DIMENSION,
        mediaType: 'photo',
        quality: CAMERA_CAPTURE_QUALITY,
        saveToPhotos: false,
      });
    } catch {
      continueWithImage(simulatorFallbackImage);
      return;
    } finally {
      capturingRef.current = false;
      setCapturing(false);
    }

    if (result.didCancel) return;

    const imageUri = result.assets?.[0]?.uri;
    if (result.errorCode || !imageUri) {
      if (result.errorCode === CAMERA_UNAVAILABLE_ERROR_CODE) {
        continueWithImage(simulatorFallbackImage);
        return;
      }

      if (result.errorCode === CAMERA_PERMISSION_ERROR_CODE) {
        setPermissionDenied(true);
        return;
      }

      setAlertText(result.errorMessage ?? 'Camera could not capture a plant photo. Try again.');
      return;
    }

    continueWithImage({ uri: imageUri });
  }, [continueWithImage, simulatorFallbackImage]);

  return (
    <ScreenLayout
      topActions={(
        <TopActions
          leftIcon="flashOff"
          leftLabel="Flash off"
          onLeftPress={() => undefined}
          onRightPress={() => navigation.getParent()?.goBack()}
          rightIcon="close"
          rightLabel="Close camera"
        />
      )}
      bottomActionsOverlay={false}
      bottomActions={(
        <BottomActions
          primaryButton={(
            <Button
              disabled={capturing}
              icon="circle"
              iconOnly
              iconSize={sizes.icon.xl}
              accessibilityLabel="Snap photo"
              loading={capturing}
              onPress={handleCapture}
            />
          )}
        />
      )}>
      <Image source={simulatorFallbackImage} style={styles.previewImage} />
      {alertText ? (
        <AlertModal
          onClose={() => setAlertText(null)}
          text={alertText}
          variant="error"
          visible
        />
      ) : null}
      {permissionDenied ? (
        <AlertModal
          actionLabel={PERMISSION_ACTION_LABEL}
          onClose={() => {
            setPermissionDenied(false);
            Linking.openSettings();
          }}
          text={PERMISSION_ALERT_TEXT}
          variant="info"
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
