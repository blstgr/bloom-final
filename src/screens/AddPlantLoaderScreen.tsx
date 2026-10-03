import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AlertModal } from '../components/ui/AlertModal';
import { BottomActions } from '../components/ui/BottomActions';
import { Loader } from '../components/ui/Loader';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { TopActions } from '../components/ui/TopActions';
import {
  usePlantData,
} from '../features/plants/data/PlantDataProvider';
import type { SpeciesLookupFailureReason } from '../features/plants/data/speciesResolution';
import { SCREENS, type AddPlantLoaderScreenProps } from '../navigation';
import { sizes } from '../theme';

const IDENTIFICATION_FAILURE_TEXT =
  "Oops... we can't quite tell what plant that is. Try another photo with better lighting!";
const CARE_INFO_UNAVAILABLE_TEXT =
  "We identified this plant, but don't have care info for it yet. Try another plant.";
const RATE_LIMITED_TEXT = "We're getting a lot of requests right now. Please try again in a moment.";
// Distinct from IDENTIFICATION_FAILURE_TEXT on purpose — this is an access problem (e.g. an
// IP-allowlist mismatch), not a bad photo, so it shouldn't tell the user to retake it.
const ACCESS_DENIED_TEXT = "We're having trouble reaching our plant ID service right now. Please try again later.";
const RETAKE_ACTION_LABEL = 'Retake';

const FAILURE_TEXT_BY_REASON: Record<SpeciesLookupFailureReason, string> = {
  'access-denied': ACCESS_DENIED_TEXT,
  'low-confidence': IDENTIFICATION_FAILURE_TEXT,
  'network-error': IDENTIFICATION_FAILURE_TEXT,
  'no-candidates': IDENTIFICATION_FAILURE_TEXT,
  'no-perenual-match': CARE_INFO_UNAVAILABLE_TEXT,
  'rate-limited': RATE_LIMITED_TEXT,
};

export function AddPlantLoaderScreen({
  navigation,
  route,
}: AddPlantLoaderScreenProps) {
  const {
    addSearchHistoryEntry,
    getDetectionById,
    identifyAndResolveSpecies,
    resolveDetectionSpecies,
  } = usePlantData();
  const captureId = route.params?.captureId;
  const mode = route.params?.mode;
  const detection = getDetectionById(captureId);
  const previewImage = detection?.image;
  const [failureText, setFailureText] = React.useState<string | null>(null);
  const resolvingDetectionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!detection || detection.speciesId || resolvingDetectionIdRef.current === detection.detectionId) {
      return undefined;
    }

    resolvingDetectionIdRef.current = detection.detectionId;
    let cancelled = false;

    identifyAndResolveSpecies(detection.image).then(result => {
      // The user may have already navigated away (e.g. closed recognition) while this was in
      // flight — don't act on a stale result against a screen that's no longer active.
      if (cancelled) return;

      if (!result.success) {
        setFailureText(FAILURE_TEXT_BY_REASON[result.reason]);
        return;
      }

      resolveDetectionSpecies(detection.detectionId, result.species);

      if (mode === 'search') {
        // This flow never passes through plant search's own result rows, so the detected
        // species is recorded here instead, or it would never show up in recent searches.
        addSearchHistoryEntry(result.species);
        // Replaces the camera stack in place (rather than pushing on top of it), so closing
        // the article naturally returns to the screen the camera flow was launched from.
        // The action bubbles up to the root stack since SPECIES_INFO isn't a screen in this
        // (AddPlantStack) navigator, replacing the AddPlantStack route itself there.
        navigation.replace(SCREENS.SPECIES_INFO, { speciesId: result.species.speciesId });
        return;
      }

      navigation.navigate(SCREENS.ADD_PLANT_PREFILLED, { detectionId: captureId });
    });

    return () => {
      cancelled = true;
    };
  }, [
    addSearchHistoryEntry,
    captureId,
    detection,
    identifyAndResolveSpecies,
    mode,
    navigation,
    resolveDetectionSpecies,
  ]);

  const handleRetake = React.useCallback(() => {
    navigation.replace(SCREENS.ADD_PLANT_CAMERA, { mode });
  }, [mode, navigation]);

  if (!detection || !previewImage) {
    return (
      <AlertModal
        actionLabel={RETAKE_ACTION_LABEL}
        onClose={handleRetake}
        text="Plant recognition could not start because no captured plant photo was found."
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
          rightLabel="Close recognition"
        />
      )}
      bottomActionsOverlay={false}
      bottomActions={<BottomActions bottomBar={<View style={styles.hiddenSnapFooter} />} />}>
      <View style={styles.cameraPreview}>
        <Image source={previewImage} style={styles.previewImage} />
        <View style={styles.loaderOverlay}>
          <Loader />
        </View>
      </View>
      {failureText ? (
        <AlertModal
          actionLabel={RETAKE_ACTION_LABEL}
          onClose={handleRetake}
          text={failureText}
          variant="info"
          visible
        />
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  cameraPreview: {
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  hiddenSnapFooter: {
    height: sizes.nav.item,
    width: sizes.nav.item,
  },
  loaderOverlay: {
    alignItems: 'center',
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
});
