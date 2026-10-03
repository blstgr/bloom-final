import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { makeThemedStyles, sizes, spacing, typography, useTheme } from '../../../theme';
import { Icon } from '../Icon';
import { Touchable } from '../Touchable';

// Reserve space for the trailing edit icon + gap when bounding the text's wrap width, so the
// row hugs the text's *actual* rendered (post-wrap) size instead of the full available width.
const EDIT_ICON_RESERVED_WIDTH = sizes.icon.md + spacing.xs;

// iOS reports TextInput contentSize via native font metrics, ignoring styled lineHeight.
// This buffer compensates for the discrepancy so the last line is never clipped.
const IOS_LINE_HEIGHT_BUFFER = spacing.xs;

export type EditableTitleVariant = 'titleM' | 'titleXl';
export type EditableTitleAlign = 'center' | 'left';

export type EditableTitleProps = {
  align?: EditableTitleAlign;
  maxLength?: number;
  /** Called when editing finishes (blur/submit). Return false to reject — the field reverts to `value` and exits edit mode. */
  onSubmit: (value: string) => boolean;
  placeholder?: string;
  value: string;
  variant?: EditableTitleVariant;
};

function sanitizeTitle(value: string) {
  return value.replace(/\n/g, '');
}

export function EditableTitle({
  align = 'center',
  maxLength,
  onSubmit,
  placeholder = 'Enter plant name',
  value,
  variant = 'titleM',
}: EditableTitleProps) {
  const theme = useTheme();
  const themedStyles = useThemedStyles();
  const textStyle = typography[variant];
  const singleLineHeight = textStyle.lineHeight;
  const isCentered = align === 'center';
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [inputHeight, setInputHeight] = React.useState<number>(singleLineHeight);
  const [availableWidth, setAvailableWidth] = React.useState<number | null>(null);
  const inputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const displayAccessibilityLabel = value.trim().length > 0 ? `Edit ${value}` : `Edit ${placeholder}`;

  const handleBlur = React.useCallback(() => {
    const nextName = draft.trim();
    // Empty value is not a valid saved state; keep editing active.
    if (nextName.length === 0) {
      setEditing(true);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    // Rejected (e.g. duplicate name): revert to the last committed value.
    if (!onSubmit(nextName)) setDraft(value);
    setEditing(false);
  }, [draft, onSubmit, value]);

  const handleSubmitEditing = React.useCallback(() => {
    // Multiline TextInputs can insert a newline before submit/keypress finishes.
    const sanitized = sanitizeTitle(draft);
    if (sanitized !== draft) setDraft(sanitized);
    inputRef.current?.blur();
  }, [draft]);

  return (
    <View style={styles.root} onLayout={e => setAvailableWidth(e.nativeEvent.layout.width)}>
      {editing ? (
        <View style={styles.editWrap}>
          {/*
           * iOS: onContentSizeChange reports heights via native font metrics, ignoring the
           * styled lineHeight, so it clips multi-line content. Text layout is always accurate,
           * so we mirror the input text invisibly and read its onLayout height instead.
           */}
          <Text
            style={[
              styles.input,
              themedStyles.input,
              isCentered ? styles.inputCentered : styles.inputLeft,
              textStyle,
              { textAlign: align },
              styles.mirror,
            ]}
            onLayout={e => setInputHeight(e.nativeEvent.layout.height + IOS_LINE_HEIGHT_BUFFER)}
          >
            {draft || placeholder}
          </Text>
          <TextInput
            ref={inputRef}
            accessibilityLabel={placeholder}
            autoFocus
            maxLength={maxLength}
            multiline
            onBlur={handleBlur}
            onChangeText={next => {
              const sanitized = sanitizeTitle(next);
              setDraft(sanitized);
              if (sanitized !== next) inputRef.current?.blur();
            }}
            onKeyPress={e => {
              // iOS never fires onSubmitEditing for multiline inputs — Enter just inserts a
              // newline, so intercept it here instead (handleSubmitEditing strips the newline).
              if (e.nativeEvent.key === 'Enter') handleSubmitEditing();
            }}
            onSubmitEditing={handleSubmitEditing}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text.placeholder}
            returnKeyType="done"
            scrollEnabled={false}
            style={[
              styles.input,
              themedStyles.input,
              isCentered ? styles.inputCentered : styles.inputLeft,
              textStyle,
              { height: inputHeight, minHeight: singleLineHeight, textAlign: align },
            ]}
            textAlignVertical="top"
            value={draft}
          />
        </View>
      ) : (
        <Touchable
          accessibilityLabel={displayAccessibilityLabel}
          accessibilityRole="button"
          onPress={() => setEditing(true)}
          style={[styles.displayRow, isCentered && styles.displayRowCentered]}>
          <Text
            style={[
              styles.displayText,
              themedStyles.displayText,
              textStyle,
              { textAlign: align },
              availableWidth != null
                ? { maxWidth: availableWidth - EDIT_ICON_RESERVED_WIDTH }
                : null,
            ]}
          >
            {value.length > 0 ? value : ''}
          </Text>
          <Icon color={theme.colors.icon.primary} name="edit" />
        </Touchable>
      )}
    </View>
  );
}

const useThemedStyles = makeThemedStyles(theme => ({
  displayText: {
    color: theme.colors.text.primary,
  },
  input: {
    backgroundColor: theme.colors.raised,
    color: theme.colors.text.primary,
  },
}));

const styles = StyleSheet.create({
  root: {
    maxWidth: '100%',
    width: '100%',
  },
  editWrap: {
    maxWidth: '100%',
    width: '100%',
  },
  displayRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  displayRowCentered: {
    alignSelf: 'center',
  },
  displayText: {
    letterSpacing: 0,
  },
  input: {
    letterSpacing: 0,
    maxWidth: '100%',
    paddingHorizontal: spacing.none,
    paddingVertical: spacing.none,
    textAlignVertical: 'top',
  },
  inputCentered: {
    alignSelf: 'center',
  },
  inputLeft: {
    alignSelf: 'flex-start',
  },
  mirror: {
    opacity: 0,
    position: 'absolute',
  },
});
