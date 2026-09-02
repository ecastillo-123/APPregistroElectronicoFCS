import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radii, type ThemeColors } from '../theme';
import { useTheme, useThemedStyles } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useThemedStyles(hacerEstilos);

  const palette: Record<string, { bg: string; fg: string }> = {
    primary: { bg: colors.blue, fg: colors.white },
    success: { bg: colors.success, fg: colors.white },
    danger: { bg: colors.danger, fg: colors.white },
    ghost: { bg: 'transparent', fg: colors.blue },
  };

  const { bg, fg } = palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        variant === 'ghost' && { borderColor: colors.blue },
        pressed && styles.pressed,
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Badge({
  text,
  tone,
}: {
  text: string;
  tone: 'ok' | 'bad' | 'warn' | 'neutral';
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useThemedStyles(hacerEstilos);

  const toneStyle =
    tone === 'ok'
      ? { bg: colors.successSoft, fg: colors.success }
      : tone === 'bad'
        ? { bg: colors.dangerSoft, fg: colors.danger }
        : tone === 'warn'
          ? { bg: colors.blueSoft, fg: colors.blueDeep }
          : { bg: colors.line, fg: colors.inkSoft };

  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.badgeText, { color: toneStyle.fg }]}>{text}</Text>
    </View>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(hacerEstilos);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function Input({
  ...props
}: React.ComponentProps<typeof RNTextInput>) {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useThemedStyles(hacerEstilos);
  return (
    <RNTextInput
      placeholderTextColor={colors.muted}
      style={[styles.input, props.style]}
      {...props}
    />
  );
}

function hacerEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: radii.md,
      minHeight: 54,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.99 }],
    },
    label: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      alignSelf: 'flex-start',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    field: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.inkSoft,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.line,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 16,
      color: colors.ink,
    },
  });
}