import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { makeThemedStyles, radii, sizes, spacing, ThemeProvider, useTheme } from '../../../theme';
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
      {/* The modal looks the same in both themes, its light look being the reference: a dark card,
          white text and light glass buttons (user ruling, 2026-10-03). Rendering its content under
          the light theme gives every control inside it that look without per-control overrides. */}
      <ThemeProvider mode="light">
        <AlertModalContent
          actionLabel={actionLabel}
          onAction={onAction ?? handleClose}
          onClose={handleClose}
          secondaryAction={secondaryAction}
          text={text}
          title={title}
          variant={variant}
        />
      </ThemeProvider>
    </Modal>
  );
}

const useThemedStyles = makeThemedStyles(theme => ({
  backdrop: {
    backgroundColor: theme.colors.scrim,
  },
  card: {
    backgroundColor: theme.components.modal.card,
  },
  content: {
    color: theme.components.modal.content,
  },
}));

function AlertModalContent({
  actionLabel,
  onAction,
  onClose,
  secondaryAction,
  text,
  title,
  variant,
}: {
  actionLabel: string;
  onAction: () => void;
  onClose: () => void;
  secondaryAction?: AlertModalAction;
  text: string;
  title?: string;
  variant: AlertModalVariant;
}) {
  const { modal } = useTheme().components;
  const themedStyles = useThemedStyles();

  return (
    <Pressable accessible={false} onPress={onClose} style={[styles.backdrop, themedStyles.backdrop]}>
      <Pressable
        accessible={false}
        onPress={event => {
          event.stopPropagation();
        }}
        style={[styles.card, themedStyles.card]}>
        <Icon name={VARIANT_ICONS[variant]} color={modal.content} size={sizes.icon.lg} />
        <View style={styles.copy}>
          {title ? (
            <AppText
              accessibilityRole="header"
              align="center"
              style={themedStyles.content}
              variant="titleM">
              {title}
            </AppText>
          ) : null}
          <AppText align="center" style={themedStyles.content} variant="body">
            {text}
          </AppText>
        </View>
        <View style={styles.actions}>
          <Button label={actionLabel} layout="fill" onPress={onAction} size="small" variant="secondary" />
          {secondaryAction ? (
            // Glass like the first: a modal carries no primary button (user ruling, 2026-10-03) —
            // on the dark card a dark pill would vanish. Order gives the hierarchy.
            <Button
              label={secondaryAction.label}
              layout="fill"
              onPress={secondaryAction.onPress}
              size="small"
              variant="secondary"
            />
          ) : null}
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
    width: '100%',
  },
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
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
