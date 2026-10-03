import React from 'react';
import { PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';

import { GlassView } from '../../../../components/ui/GlassView';
import { Icon } from '../../../../components/ui/Icon';
import { makeThemedStyles, radii, shadows, sizes, spacing, useTheme } from '../../../../theme';

const SLIDER_MAX_WIDTH = 329;
const PROGRESS_FILL_RATIO = 0.35;
// Small px epsilon so the thumb reliably snaps at the visual end.
const COMPLETE_THRESHOLD_OFFSET = 2;
const SLIDER_HORIZONTAL_MARGIN_COUNT = 2;
// Matches the track's own height exactly — per Figma, the thumb doesn't overflow it.
const THUMB_HEIGHT = sizes.button.default;

export type WateringSliderState = 'default' | 'progress' | 'completed';

type WateringSliderCommonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
};

type WateringSliderActionProps = {
  onComplete?: () => void;
  /** Fired when the slider is dragged back to default from a completed state. */
  onUndo?: () => void;
};

type ControlledWateringSliderProps = WateringSliderCommonProps & {
  initialState?: never;
  onComplete?: never;
  onUndo?: never;
  /** Fully controlled/static override — also disables the drag gesture. For fixed demo states only. */
  state?: WateringSliderState;
};

type UncontrolledWateringSliderProps = WateringSliderCommonProps & WateringSliderActionProps & {
  /** Seeds the initial visual state while keeping the slider draggable (uncontrolled). */
  initialState?: WateringSliderState;
  state?: undefined;
};

export type WateringSliderProps = ControlledWateringSliderProps | UncontrolledWateringSliderProps;

export function WateringSlider({
  accessibilityLabel = 'Complete watering',
  disabled = false,
  initialState,
  onComplete,
  onUndo,
  state,
}: WateringSliderProps) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const themedStyles = useThemedStyles();
  const sliderWidth = Math.min(width - spacing.xxl * SLIDER_HORIZONTAL_MARGIN_COUNT, SLIDER_MAX_WIDTH);
  // Matches THUMB_HEIGHT, so the resting/completed state — where width equals this minimum —
  // renders as a true circle rather than an oval.
  const minThumbWidth = THUMB_HEIGHT;
  // Keep a small epsilon so reaching the visual end reliably counts as completed.
  const completedThreshold = sliderWidth - COMPLETE_THRESHOLD_OFFSET;
  const seededWidth =
    initialState === 'completed'
      ? sliderWidth
      : initialState === 'progress'
        ? sliderWidth * PROGRESS_FILL_RATIO
        : minThumbWidth;

  const [internalState, setInternalState] = React.useState<WateringSliderState>(initialState ?? 'default');
  const [dragWidth, setDragWidth] = React.useState<number>(seededWidth);
  const dragStartWidthRef = React.useRef<number>(seededWidth);
  const currentWidthRef = React.useRef<number>(seededWidth);
  const prevSliderWidthRef = React.useRef<number>(sliderWidth);
  const wasCompletedAtGrantRef = React.useRef(false);
  const internalStateRef = React.useRef(internalState);
  internalStateRef.current = internalState;

  const activeState = state ?? internalState;

  React.useEffect(() => {
    if (state === 'default') {
      setDragWidth(minThumbWidth);
      currentWidthRef.current = minThumbWidth;
      prevSliderWidthRef.current = sliderWidth;
      return;
    }
    if (state === 'progress') {
      setDragWidth(sliderWidth * PROGRESS_FILL_RATIO);
      currentWidthRef.current = sliderWidth * PROGRESS_FILL_RATIO;
      prevSliderWidthRef.current = sliderWidth;
      return;
    }
    if (state === 'completed') {
      setDragWidth(sliderWidth);
      currentWidthRef.current = sliderWidth;
      prevSliderWidthRef.current = sliderWidth;
      return;
    }

    if (internalState === 'completed') {
      setDragWidth(sliderWidth);
      currentWidthRef.current = sliderWidth;
    } else if (internalState === 'default') {
      setDragWidth(minThumbWidth);
      currentWidthRef.current = minThumbWidth;
    } else if (internalState === 'progress' && prevSliderWidthRef.current !== sliderWidth) {
      // Proportionally scale thumb position when sliderWidth changes mid-drag (e.g. orientation flip).
      const ratio = currentWidthRef.current / prevSliderWidthRef.current;
      const scaled = Math.max(minThumbWidth, Math.min(sliderWidth, sliderWidth * ratio));
      currentWidthRef.current = scaled;
      setDragWidth(scaled);
    }
    prevSliderWidthRef.current = sliderWidth;
  }, [internalState, minThumbWidth, sliderWidth, state]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && state == null,
        onMoveShouldSetPanResponder: (_, gesture) => !disabled && state == null && Math.abs(gesture.dx) > 1,
        onPanResponderGrant: () => {
          dragStartWidthRef.current = currentWidthRef.current;
          wasCompletedAtGrantRef.current = internalStateRef.current === 'completed';
        },
        onPanResponderMove: (_, gesture) => {
          const nextWidth = Math.max(
            minThumbWidth,
            Math.min(sliderWidth, dragStartWidthRef.current - gesture.dx),
          );

          currentWidthRef.current = nextWidth;
          setDragWidth(nextWidth);
          setInternalState(nextWidth >= completedThreshold ? 'completed' : 'progress');
        },
        onPanResponderRelease: () => {
          if (currentWidthRef.current >= completedThreshold) {
            const wasAlreadyCompleted = wasCompletedAtGrantRef.current;
            currentWidthRef.current = sliderWidth;
            setDragWidth(sliderWidth);
            setInternalState('completed');
            if (!wasAlreadyCompleted) onComplete?.();
            return;
          }

          currentWidthRef.current = minThumbWidth;
          setDragWidth(minThumbWidth);
          setInternalState('default');
          if (wasCompletedAtGrantRef.current) onUndo?.();
        },
      }),
    [completedThreshold, disabled, minThumbWidth, onComplete, onUndo, sliderWidth, state], // dragWidth/internalState intentionally omitted — grant reads their refs instead
  );

  const completeSlider = React.useCallback(() => {
    if (disabled || state != null || internalStateRef.current === 'completed') return;
    currentWidthRef.current = sliderWidth;
    setDragWidth(sliderWidth);
    setInternalState('completed');
    internalStateRef.current = 'completed';
    onComplete?.();
  }, [disabled, onComplete, sliderWidth, state]);

  return (
    <View
      accessibilityActions={[{ name: 'activate', label: 'Complete' }]}
      accessibilityLabel={accessibilityLabel}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'activate') completeSlider();
      }}
      accessibilityRole="button"
      accessibilityState={{ checked: activeState === 'completed', disabled }}
      style={{ width: sliderWidth }}
      {...(state == null ? panResponder.panHandlers : undefined)}>
      {/* trackShadow holds only `track` — no overflowing child — so the boxShadow-bearing
       * view's own bounds always match its content exactly. */}
      <View style={styles.trackShadow}>
        <View
          style={[
            styles.track,
            themedStyles.track,
            activeState === 'completed' && themedStyles.completed,
          ]}>
          {activeState !== 'completed' ? <GlassView border={false} shadow={false} style={styles.blurLayer} /> : null}
        </View>
      </View>
      {/* Sibling of trackShadow, not nested inside it — `track` needs overflow: 'hidden' to clip
       * the fill/blur to the pill shape, which would also clip the thumb's vertical overflow. */}
      <View
        style={[
          styles.thumb,
          themedStyles.thumb,
          activeState === 'completed' && [styles.completedThumb, themedStyles.completed],
          activeState !== 'completed' && { width: dragWidth },
        ]}>
        <Icon name={activeState === 'completed' ? 'check' : 'water'} color={theme.colors.icon.onAccent} />
      </View>
    </View>
  );
}

const useThemedStyles = makeThemedStyles(theme => ({
  completed: {
    backgroundColor: theme.colors.success,
  },
  thumb: {
    backgroundColor: theme.colors.accent,
  },
  // A solid rim, so it takes the edge gradient's opening colour.
  track: {
    backgroundColor: theme.components.glass.fill,
    borderColor: theme.components.glass.edge[0],
  },
}));

const styles = StyleSheet.create({
  blurLayer: {
    ...StyleSheet.absoluteFill,
  },
  completedThumb: {
    width: '100%',
  },
  thumb: {
    alignItems: 'flex-start',
    borderRadius: radii.pill,
    height: THUMB_HEIGHT,
    justifyContent: 'center',
    paddingLeft: spacing.lg,
    position: 'absolute',
    right: 0,
    top: 0,
    width: THUMB_HEIGHT,
  },
  trackShadow: {
    borderRadius: radii.pill,
    ...shadows.soft,
  },
  track: {
    borderRadius: radii.pill,
    borderWidth: sizes.border.thin,
    height: sizes.button.default,
    overflow: 'hidden',
    width: '100%',
  },
});
