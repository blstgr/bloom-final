import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../../../components/ui/AppText';
import { Button } from '../../../../components/ui/Button';
import { Icon } from '../../../../components/ui/Icon';
import { Input } from '../../../../components/ui/Input';
import { Toggle } from '../../../../components/ui/Toggle';
import { Touchable } from '../../../../components/ui/Touchable';
import { colors, fontFamilies, opacities, spacing } from '../../../../theme';

const REVEALED_SUFFIX_LENGTH = 4;

type TextSettingsRowProps = {
  buttonLabel?: string;
  editFields?: Array<{
    label: string;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number';
    value: string;
  }>;
  editable?: boolean;
  label?: string;
  onPress?: () => void;
  onSave?: (value: string) => void;
  onSaveFields?: (values: string[]) => void;
  secure?: boolean;
  value?: string;
  variant: 'text' | 'textWithLabel' | 'textWithLabelAndButton' | 'buttonOnly';
};

type ToggleSettingsRowProps = {
  disabled?: boolean;
  label: string;
  onValueChange: (next: boolean) => void;
  value: boolean;
  variant: 'toggle';
};

type NavigationSettingsRowProps = {
  disabled?: boolean;
  label: string;
  onPress?: () => void;
  /** The current choice, shown at the row's trailing edge before the chevron. */
  value: string;
  variant: 'navigation';
};

/**
 * A discriminated union rather than one flat bag of optional props: `onValueChange` is
 * meaningless on a text row and `editFields` is meaningless on a toggle, and a union makes those
 * combinations unrepresentable instead of silently ignored at runtime.
 */
export type SettingsRowProps =
  | TextSettingsRowProps
  | ToggleSettingsRowProps
  | NavigationSettingsRowProps;

export function SettingsRow(props: SettingsRowProps) {
  if (props.variant === 'toggle') return <ToggleRow {...props} />;
  if (props.variant === 'navigation') return <NavigationRow {...props} />;

  return <TextRow {...props} />;
}

function ToggleRow({ disabled = false, label, onValueChange, value }: ToggleSettingsRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText style={disabled ? styles.disabledLabel : undefined}>{label}</AppText>
      </View>
      <Toggle
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function NavigationRow({ disabled = false, label, onPress, value }: NavigationSettingsRowProps) {
  const isInteractive = Boolean(onPress) && !disabled;

  // Not a Pressable when there is nowhere to go — a row that looks tappable and is not is worse
  // than a plain one. It keeps the button role and reports itself disabled, though: to a screen
  // reader the alternative is two unrelated text fragments with no hint they belong together, or
  // that this is a control that could become available.
  if (!isInteractive) {
    return (
      <View
        accessibilityLabel={`${label}, ${value}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessible
        style={styles.row}>
        <AppText style={disabled ? styles.disabledLabel : undefined}>{label}</AppText>
        <AppText style={[styles.staticValue, disabled && styles.disabledLabel]}>{value}</AppText>
      </View>
    );
  }

  return (
    <Touchable
      accessibilityLabel={`${label}, ${value}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={styles.row}>
      <AppText>{label}</AppText>
      <View style={styles.navigationValueGroup}>
        <AppText style={styles.navigationValue}>{value}</AppText>
        <Icon name="chevronRight" size="md" color={colors.icon.primary} />
      </View>
    </Touchable>
  );
}

function TextRow({
  buttonLabel,
  editFields,
  editable = false,
  label,
  onPress,
  onSave,
  onSaveFields,
  secure = false,
  value = '',
  variant,
}: TextSettingsRowProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [fieldDrafts, setFieldDrafts] = React.useState<string[]>(
    (editFields ?? []).map(f => f.value),
  );
  const hasLabel = variant === 'textWithLabel' || variant === 'textWithLabelAndButton';
  const hasButton = variant === 'textWithLabelAndButton' || variant === 'buttonOnly';
  const hasMultiEditFields = Boolean(editFields && editFields.length > 1);

  React.useEffect(() => { setDraft(value); }, [value]);
  React.useEffect(() => {
    setFieldDrafts((editFields ?? []).map(f => f.value));
  }, [editFields]);

  const displayValue = React.useMemo(() => {
    if (!secure || isEditing) return value;
    if ((label ?? '').toLowerCase().includes('api key')) {
      return `${'•'.repeat(Math.max(0, value.length - REVEALED_SUFFIX_LENGTH))}${value.slice(-REVEALED_SUFFIX_LENGTH)}`;
    }
    return value.replace(/./g, '•');
  }, [isEditing, label, secure, value]);

  const handleSaveOrEdit = () => {
    if (editable) {
      if (isEditing) {
        if (hasMultiEditFields) {
          onSaveFields?.(fieldDrafts);
        } else {
          onSave?.(draft);
        }
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    }
    onPress?.();
  };

  if (variant === 'buttonOnly') {
    return (
      <View style={styles.row}>
        <Button label={buttonLabel ?? 'Log out'} layout="fill" onPress={onPress} size="small" variant="primary" />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {hasLabel && label && !isEditing ? <AppText variant="titleS">{label}</AppText> : null}
        {isEditing ? (
          hasMultiEditFields && editFields ? (
            <View style={styles.editFields}>
              {editFields.map((field, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <Input key={`${field.label}-${index}`}
                  label={field.label}
                  onBlur={() => {}}
                  onChangeText={next =>
                    setFieldDrafts(prev => prev.map((v, i) => (i === index ? next : v)))
                  }
                  placeholder={field.placeholder}
                  type={field.type ?? 'text'}
                  value={fieldDrafts[index] ?? field.value}
                />
              ))}
            </View>
          ) : (
            <Input
              label={label ?? ''}
              onBlur={() => {}}
              onChangeText={setDraft}
              placeholder={secure ? 'New password' : undefined}
              type={secure ? 'password' : 'text'}
              value={draft}
            />
          )
        ) : (
          <AppText>{displayValue}</AppText>
        )}
      </View>
      {hasButton && buttonLabel ? (
        <Button
          label={isEditing ? 'Save' : buttonLabel}
          layout="hug"
          onPress={handleSaveOrEdit}
          size="small"
          style={styles.actionButton}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignSelf: 'flex-end',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  editFields: {
    gap: spacing.xs,
    width: '100%',
  },
  disabledLabel: {
    opacity: opacities.disabled,
  },
  // Values read heavier than their labels (Satoshi Black, user review 2026-10-03), whether they
  // can be changed from here or not: the city is the answer, the label only the question.
  navigationValue: {
    color: colors.text.primary,
    fontFamily: fontFamilies.bodyBlack,
  },
  staticValue: {
    color: colors.text.primary,
    fontFamily: fontFamilies.bodyBlack,
  },
  navigationValueGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  row: {
    alignItems: 'flex-end',
    backgroundColor: colors.surface.white,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.xxl,
  },
});
