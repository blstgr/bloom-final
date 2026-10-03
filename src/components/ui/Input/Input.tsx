import React from 'react';
import { StyleSheet, TextInput, View, type GestureResponderEvent } from 'react-native';

import { colors, radii, sizes, spacing, typography } from '../../../theme';
import { AppText } from '../AppText';
import { GlassView } from '../GlassView';
import { Icon, type IconName, type IconSize } from '../Icon';
import { Touchable } from '../Touchable';

export type InputType = 'text' | 'email' | 'password' | 'number';

export type InputAction = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: IconName;
  iconSize?: IconSize;
  key: string;
  onPress: (event: GestureResponderEvent) => void;
};

export type InputActions = [] | [InputAction] | [InputAction, InputAction];

type InputBaseProps = {
  accessibilityLabel?: string;
  actions?: InputActions;
  disabled?: boolean;
  error?: string;
  leadingIcon?: IconName;
  leadingIconSize?: IconSize;
  labelIcon?: IconName;
  label?: string;
  placeholder?: string;
};

type EditableInputProps = InputBaseProps & {
  /** Raises the keyboard on mount. For a screen whose only purpose is the search it contains. */
  autoFocus?: boolean;
  /** The underlying field, for a caller that has to focus it at a moment of its own choosing
   * (after a screen transition, where a mount-time `autoFocus` loses the keyboard on Android). */
  inputRef?: React.Ref<TextInput>;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onPress?: never;
  type?: InputType;
  value: string;
};

/**
 * The field as a button: it shows the placeholder and opens the real input somewhere else (the
 * Library search bar opens the search screen). Taking `onPress` rules out `value` and
 * `onChangeText`, so a trigger cannot be half-wired as an editable field that never edits.
 */
type TriggerInputProps = InputBaseProps & {
  autoFocus?: never;
  inputRef?: never;
  onBlur?: never;
  onChangeText?: never;
  onFocus?: never;
  onPress: () => void;
  type?: never;
  value?: never;
};

export type InputProps = EditableInputProps | TriggerInputProps;

const MAX_INPUT_ACTIONS = 2;
const DISABLED_INPUT_OPACITY = 0.64;

export function Input(props: InputProps) {
  const {
    accessibilityLabel,
    actions = [],
    disabled = false,
    error,
    leadingIcon,
    leadingIconSize = 'sm',
    labelIcon,
    label,
    placeholder,
  } = props;
  const visibleActions = actions.slice(0, MAX_INPUT_ACTIONS);
  const resolvedAccessibilityLabel = firstNonEmptyText(accessibilityLabel, label, placeholder) ?? 'Input';
  const hasLabelRow = firstNonEmptyText(label) != null || labelIcon != null;
  const textStyle = [
    styles.input,
    !leadingIcon && styles.inputLeadingPadding,
    visibleActions.length === 0 && styles.inputTrailingPadding,
    disabled && styles.inputDisabled,
  ];

  return (
    <View style={styles.container}>
      {hasLabelRow ? (
        <View style={styles.labelRow}>
          {labelIcon ? <Icon name={labelIcon} /> : null}
          {label ? <AppText variant="titleS">{label}</AppText> : null}
        </View>
      ) : null}
      <GlassView radius={radii.pill}>
        <View
          style={[
            styles.inputWrapper,
            Boolean(error) && styles.inputWrapperError,
            disabled && styles.inputWrapperDisabled,
          ]}>
          {props.onPress ? (
            // The whole bar opens the search except the trailing actions, which keep their own
            // targets (e.g. the camera opens photo search, not text search).
            <Touchable
              accessibilityLabel={resolvedAccessibilityLabel}
              accessibilityRole="search"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={props.onPress}
              style={[styles.triggerArea, visibleActions.length === 0 && styles.triggerAreaOuter]}>
              {leadingIcon ? <LeadingIcon disabled={disabled} icon={leadingIcon} size={leadingIconSize} /> : null}
              <AppText numberOfLines={1} style={[textStyle, styles.placeholder]}>
                {placeholder}
              </AppText>
            </Touchable>
          ) : (
            <>
              {leadingIcon ? <LeadingIcon disabled={disabled} icon={leadingIcon} size={leadingIconSize} /> : null}
              <EditableField
                {...props}
                accessibilityLabel={resolvedAccessibilityLabel}
                disabled={disabled}
                style={textStyle}
              />
            </>
          )}
          {visibleActions.length > 0 ? (
            <View style={styles.actions}>
              {visibleActions.map((action, index) => (
                <Touchable
                  accessibilityLabel={action.accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: disabled || action.disabled }}
                  disabled={disabled || action.disabled}
                  key={action.key}
                  onPress={action.onPress}
                  ripple="borderless"
                  style={[
                    styles.actionButton,
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
                </Touchable>
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

function LeadingIcon({ disabled, icon, size }: { disabled: boolean; icon: IconName; size: IconSize }) {
  return (
    <View style={styles.leadingIconSlot}>
      <Icon color={disabled ? colors.action.disabled : colors.icon.primary} name={icon} size={size} />
    </View>
  );
}

function EditableField({
  accessibilityLabel,
  autoFocus = false,
  disabled,
  inputRef,
  onBlur,
  onChangeText,
  onFocus,
  placeholder,
  style,
  type = 'text',
  value,
}: EditableInputProps & { accessibilityLabel: string; disabled: boolean; style: React.ComponentProps<typeof TextInput>['style'] }) {
  return (
    <TextInput
      ref={inputRef}
      accessibilityLabel={accessibilityLabel}
      autoFocus={autoFocus}
      blurOnSubmit
      editable={!disabled}
      keyboardType={type === 'number' ? 'numeric' : type === 'email' ? 'email-address' : 'default'}
      multiline={false}
      onBlur={onBlur}
      onChangeText={onChangeText}
      onFocus={onFocus}
      placeholder={placeholder}
      placeholderTextColor={disabled ? colors.action.disabled : colors.text.muted}
      secureTextEntry={type === 'password'}
      style={style}
      value={value}
    />
  );
}

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
  // minHeight rather than height, here and on the field: the text scales with the OS font size,
  // and a fixed height would clip it at the larger accessibility sizes (docs/search-spec.md §6).
  inputWrapper: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    minHeight: sizes.input.height,
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
    minHeight: sizes.input.height,
    paddingVertical: spacing.none,
  },
  // Only add horizontal breathing room on an edge that isn't already padded by an
  // adjacent leadingIcon slot or action button.
  inputLeadingPadding: {
    paddingLeft: spacing.md,
  },
  inputTrailingPadding: {
    paddingRight: spacing.md,
  },
  inputDisabled: {
    color: colors.action.disabled,
  },
  placeholder: {
    color: colors.text.muted,
    minHeight: undefined,
  },
  // Rounded and clipped on the pill's side, so the Android ripple follows the pill's rounded end
  // instead of spilling past it into the bounding rectangle. The edge that meets an action stays
  // square, like the action's own inner edge.
  triggerArea: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderBottomLeftRadius: radii.pill,
    borderTopLeftRadius: radii.pill,
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  // With no actions the trigger reaches the pill's other end too.
  triggerAreaOuter: {
    borderBottomRightRadius: radii.pill,
    borderTopRightRadius: radii.pill,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionButton: {
    alignItems: 'center',
    height: sizes.input.height,
    justifyContent: 'center',
    width: sizes.input.actionWidth,
  },
  // Rounds only the edge that touches the pill's own outer boundary — applied to whichever
  // action is currently last, regardless of how many actions are visible.
  actionButtonOuter: {
    borderBottomRightRadius: radii.pill,
    borderTopRightRadius: radii.pill,
  },
  // Hugs the icon: 16 inset, the icon, then an 8 gap to the text. The same geometry as the search
  // result rows (SearchOverlay), so icons and text line up down the whole column.
  leadingIconSlot: {
    alignItems: 'center',
    height: sizes.input.height,
    justifyContent: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
});
