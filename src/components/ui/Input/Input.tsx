import React from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { colors, radii, sizes, spacing, typography } from '../../../theme';
import { AppText } from '../AppText';
import { GlassView } from '../GlassView';
import { Icon, type IconName, type IconSize } from '../Icon';

export type InputType = 'text' | 'email' | 'password' | 'number';
export type InputSize = 'default' | 'large';

export type InputAction = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: IconName;
  iconSize?: IconSize;
  key: string;
  onPress: (event: GestureResponderEvent) => void;
};

export type InputActions = [] | [InputAction] | [InputAction, InputAction];

export type InputProps = {
  accessibilityLabel?: string;
  actions?: InputActions;
  /** Raises the keyboard on mount. For a screen whose only purpose is the search it contains. */
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  leadingIcon?: IconName;
  leadingIconSize?: IconSize;
  labelIcon?: IconName;
  label?: string;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  size?: InputSize;
  type?: InputType;
  value: string;
};

export function Input({
  accessibilityLabel,
  actions = [],
  autoFocus = false,
  disabled = false,
  error,
  leadingIcon,
  leadingIconSize = 'sm',
  labelIcon,
  label,
  onBlur,
  onChangeText,
  onFocus,
  placeholder,
  size = 'default',
  type = 'text',
  value,
}: InputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);
  const visibleActions = actions.slice(0, MAX_INPUT_ACTIONS);
  const resolvedAccessibilityLabel = firstNonEmptyText(accessibilityLabel, label, placeholder) ?? 'Input';
  const hasLabelRow = firstNonEmptyText(label) != null || labelIcon != null;
  const isLarge = size === 'large';

  return (
    <View style={styles.container}>
      {hasLabelRow ? (
        <View style={styles.labelRow}>
          {labelIcon ? <Icon name={labelIcon} /> : null}
          {label ? <AppText variant="titleS">{label}</AppText> : null}
        </View>
      ) : null}
      <GlassView
        fallbackColor={isFocused ? colors.surface.peachDark : colors.surface.creamWarm}
        radius={radii.pill}
        shadow={false}
        style={styles.inputShadowWrap}
        tintColor={isFocused ? colors.surface.peachDark : colors.surface.creamWarm}
      >
        <View
          style={[
            styles.inputWrapper,
            isLarge && styles.inputWrapperLarge,
            Boolean(error) && styles.inputWrapperError,
            disabled && styles.inputWrapperDisabled,
          ]}>
          {leadingIcon ? (
            <View style={isLarge ? styles.leadingIconSlotLarge : styles.leadingIconSlot}>
              <Icon
                color={disabled ? colors.action.disabled : colors.icon.primary}
                name={leadingIcon}
                size={leadingIconSize}
              />
            </View>
          ) : null}
          <TextInput
            ref={inputRef}
            accessibilityLabel={resolvedAccessibilityLabel}
            autoFocus={autoFocus}
            blurOnSubmit
            editable={!disabled}
            keyboardType={type === 'number' ? 'numeric' : type === 'email' ? 'email-address' : 'default'}
            multiline={false}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            onChangeText={onChangeText}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            placeholder={placeholder}
            placeholderTextColor={disabled ? colors.action.disabled : colors.text.muted}
            secureTextEntry={type === 'password'}
            style={[
              styles.input,
              isLarge && styles.inputLarge,
              !leadingIcon && styles.inputLeadingPadding,
              visibleActions.length === 0 && styles.inputTrailingPadding,
              isFocused && styles.inputFocused,
              disabled && styles.inputDisabled,
            ]}
            value={value}
          />
          {visibleActions.length > 0 ? (
            <View style={styles.actions}>
              {visibleActions.map((action, index) => (
                <TouchableOpacity
                  accessibilityLabel={action.accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: disabled || action.disabled }}
                  disabled={disabled || action.disabled}
                  key={action.key}
                  onPress={action.onPress}
                  style={[
                    styles.actionButton,
                    isLarge && styles.actionButtonLarge,
                    // Only the outermost action (last in the row) sits against the pill's own
                    // rounded edge — any actions before it are sandwiched between the text field
                    // and another action button, so they stay square on both sides.
                    index === visibleActions.length - 1 && styles.actionButtonOuter,
                  ]}>
                  <Icon
                    color={disabled || action.disabled ? colors.action.disabled : colors.icon.primary}
                    name={action.icon}
                    size={action.iconSize ?? 'sm'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </GlassView>
      {error ? (
        <AppText variant="body" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const MAX_INPUT_ACTIONS = 2;
const DISABLED_INPUT_OPACITY = 0.64;

function firstNonEmptyText(...values: Array<string | undefined>) {
  return values.find(value => value != null && value.length > 0);
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    width: '100%',
  },
  errorText: {
    color: colors.brand.orange,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  // Shadow lives on this outer wrap, never on inputWrapper itself — inputWrapper needs
  // overflow: 'hidden' to clip to the pill shape, which would also clip a shadow placed on
  // the same view. Toggling that combination in response to focus is what was destabilizing
  // the native keyboard session right as it tried to present.
  inputShadowWrap: {
    borderRadius: radii.pill,
  },
  inputWrapper: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    height: sizes.input.height,
    overflow: 'hidden',
  },
  inputWrapperLarge: {
    height: sizes.input.heightLarge,
  },
  inputWrapperDisabled: {
    opacity: DISABLED_INPUT_OPACITY,
  },
  inputWrapperError: {
    borderColor: colors.brand.orange,
    borderRadius: radii.pill,
    borderWidth: sizes.border.thin,
  },
  input: {
    color: colors.text.primary,
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    height: sizes.input.height,
    paddingVertical: spacing.none,
  },
  inputLarge: {
    height: sizes.input.heightLarge,
  },
  // Only add horizontal breathing room on an edge that isn't already padded by an
  // adjacent leadingIcon slot or action button.
  inputLeadingPadding: {
    paddingLeft: spacing.xs,
  },
  inputTrailingPadding: {
    paddingRight: spacing.xs,
  },
  inputDisabled: {
    color: colors.action.disabled,
  },
  inputFocused: {
    color: colors.text.primary,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionButton: {
    alignItems: 'center',
    height: sizes.input.height,
    justifyContent: 'center',
    width: sizes.input.height,
  },
  actionButtonLarge: {
    height: sizes.input.heightLarge,
    width: sizes.input.heightLarge,
  },
  // Rounds only the edge that touches the pill's own outer boundary — applied to whichever
  // action is currently last, regardless of size or how many actions are visible.
  actionButtonOuter: {
    borderBottomRightRadius: radii.pill,
    borderTopRightRadius: radii.pill,
  },
  leadingIconSlot: {
    alignItems: 'center',
    borderBottomLeftRadius: radii.pill,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: radii.pill,
    borderTopRightRadius: 0,
    height: sizes.input.height,
    justifyContent: 'center',
    width: sizes.input.height,
  },
  // Large variant hugs the icon instead of matching a fixed square slot: width comes from the
  // icon's own intrinsic size plus this padding, not from the row height.
  //
  // The two paddings differ on purpose. `paddingLeft` matches the suggestion rows'
  // `paddingHorizontal` (LibraryScreen `resultRow`) so both search icons sit on the same x.
  // `paddingRight` matches those rows' `gap` so the text after the icon lands on the same x too —
  // a symmetric spacing.md here would push the typed query 8px right of every suggestion below it.
  leadingIconSlotLarge: {
    alignItems: 'center',
    borderBottomLeftRadius: radii.pill,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: radii.pill,
    borderTopRightRadius: 0,
    height: sizes.input.heightLarge,
    justifyContent: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
});
