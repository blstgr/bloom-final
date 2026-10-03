import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, sizes, spacing } from '../../../theme';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { Icon, type IconName } from '../Icon';

export type AlertModalVariant = 'info' | 'error' | 'weather';

export type AlertModalAction = {
  label: string;
  onPress: () => void;
};

const DEFAULT_ACTION_LABEL = 'Close';

const VARIANT_ICONS: Record<AlertModalVariant, IconName> = {
  error: 'dropSad',
  info: 'info',
  weather: 'dropHappy',
};

type AlertModalBaseProps = {
  /** Dismissal: the primary button (unless `onAction` is given), a backdrop tap, Android back. */
  onClose?: () => void;
  /** A second, lower-emphasis choice under the primary one. */
  secondaryAction?: AlertModalAction;
  text: string;
  title?: string;
  variant: AlertModalVariant;
  visible: boolean;
};

/** The primary button dismisses; its label defaults to "Close". */
type DismissingPrimaryProps = {
  actionLabel?: string;
  onAction?: never;
};

/** The primary button does something other than dismissing (an explainer's "Allow"), so it must
 * say what: a default "Close" on a button that does not close would misstate it. */
type ActingPrimaryProps = {
  actionLabel: string;
  onAction: () => void;
};

export type AlertModalProps = AlertModalBaseProps & (DismissingPrimaryProps | ActingPrimaryProps);

export function AlertModal({
  actionLabel = DEFAULT_ACTION_LABEL,
  onAction,
  onClose,
  secondaryAction,
  text,
  title,
  variant,
  visible,
}: AlertModalProps) {
  const handleClose = React.useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <Modal onRequestClose={handleClose} transparent visible={visible}>
      <Pressable accessible={false} onPress={handleClose} style={styles.backdrop}>
        <Pressable
          accessible={false}
          onPress={event => {
            event.stopPropagation();
          }}
          style={styles.card}>
          <Icon name={VARIANT_ICONS[variant]} color={colors.icon.inverse} size={sizes.icon.lg} />
          <View style={styles.copy}>
            {title ? (
              <AppText accessibilityRole="header" align="center" tone="inverse" variant="titleM">
                {title}
              </AppText>
            ) : null}
            <AppText align="center" tone="inverse" variant="body">
              {text}
            </AppText>
          </View>
          <View style={styles.actions}>
            <Button
              label={actionLabel}
              layout="fill"
              onPress={onAction ?? handleClose}
              size="small"
              variant="secondary"
            />
            {secondaryAction ? (
              <Button
                label={secondaryAction.label}
                layout="fill"
                onPress={secondaryAction.onPress}
                size="small"
              />
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
    width: '100%',
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: colors.overlay.scrim,
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface.dark,
    borderRadius: radii.photo,
    gap: spacing.xl,
    maxWidth: sizes.modal.maxWidth,
    padding: spacing.xxl,
    width: '100%',
  },
  copy: {
    gap: spacing.xs,
    width: '100%',
  },
});
