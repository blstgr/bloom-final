import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { makeThemedStyles, typography } from '../../../theme';

export type AppTextVariant =
  // Titles — display font, 4 sizes
  | 'titleXl'
  | 'titleL'
  | 'titleM'
  | 'titleS'
  // Body — 2 variations
  | 'body'
  | 'bodyS'
  // Utility
  | 'button';

export type AppTextTone = 'primary' | 'inverse' | 'placeholder' | 'highlighted';

export type AppTextProps = TextProps & {
  align?: TextStyle['textAlign'];
  children: React.ReactNode;
  tone?: AppTextTone;
  variant?: AppTextVariant;
};

function AppTextComponent(
  {
    align = 'left',
    children,
    style,
    tone,
    variant = 'body',
    ...textProps
  }: AppTextProps,
  ref: React.ForwardedRef<Text>,
) {
  const toneStyles = useToneStyles();
  const resolvedTone = tone ?? 'primary';

  return (
    <Text
      ref={ref}
      style={[
        typography[variant],
        toneStyles[resolvedTone],
        { textAlign: align },
        style,
      ]}
      {...textProps}>
      {children}
    </Text>
  );
}

const useToneStyles = makeThemedStyles(theme => ({
  highlighted: { color: theme.colors.text.highlighted },
  inverse: { color: theme.colors.text.onAccent },
  placeholder: { color: theme.colors.text.placeholder },
  primary: { color: theme.colors.text.primary },
}));

/** Ref-forwarding so the component can be wrapped by `Reanimated.createAnimatedComponent` —
 * Reanimated drives style updates through a ref to the underlying native view, and a plain
 * function component has none, which silently freezes any animated style at its first value. */
export const AppText = React.forwardRef(AppTextComponent);
