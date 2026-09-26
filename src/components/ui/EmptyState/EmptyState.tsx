import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../../theme';
import { AppText } from '../AppText';
import { Icon, type IconName } from '../Icon';

// Tighter than the body default so a two-line subtitle reads as one block under the title.
const SUBTITLE_LINE_HEIGHT = 20;

/**
 * Reserves an empty row as the block's last child, sharing the block's gap — so whatever the
 * screen positions there is spaced like a real row rather than by a tuned padding. The slot is
 * compensated for in the centring, so the icon, title and subtitle stay where they would be on a
 * screen that has no slot at all.
 *
 * One object rather than two optional props: a height with no `onLayout` reserves space nobody
 * can find, and an `onLayout` with no height never fires. Pairing them makes that impossible to
 * express rather than merely documented.
 */
export type EmptyStateSlot = {
  height: number;
  /** Receives the slot's top edge in window coordinates, as `measureInWindow` reports it. */
  onLayout: (slotTop: number) => void;
};

export type EmptyStateProps = {
  icon: IconName;
  slot?: EmptyStateSlot;
  subtitle: string;
  title: string;
};

/**
 * The icon + title + subtitle block every tab screen shows when it has nothing to list.
 *
 * It fills its parent and centres itself, so screens that give it the same content box land it
 * on the same pixel. That is what lets the tab navigator's cross-fade dissolve one empty state
 * into the next instead of fading and jumping at the same time.
 */
export function EmptyState({ icon, slot, subtitle, title }: EmptyStateProps) {
  const slotRef = React.useRef<View>(null);
  const reportSlotLayout = slot?.onLayout;
  const handleSlotLayout = React.useCallback(() => {
    if (!reportSlotLayout) return;
    slotRef.current?.measureInWindow((_x, y) => reportSlotLayout(y));
  }, [reportSlotLayout]);

  // Padding the top by exactly what the slot adds below keeps the icon/title/subtitle centred on
  // the same line as a slotless screen's, instead of riding half the slot's height upwards.
  const centringCompensation =
    slot == null ? null : { paddingTop: slot.height + spacing.md };

  return (
    <View style={[styles.root, centringCompensation]}>
      <Icon color={colors.icon.green} name={icon} size="xxl" />
      <AppText align="center" variant="titleXl">
        {title}
      </AppText>
      <AppText align="center" style={styles.subtitle}>
        {subtitle}
      </AppText>
      {slot == null ? null : (
        <View ref={slotRef} onLayout={handleSlotLayout} style={{ height: slot.height }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flexGrow: 1,
    gap: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    lineHeight: SUBTITLE_LINE_HEIGHT,
  },
});
