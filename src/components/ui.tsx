import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color, font, shape, space, TOUCH, type } from '@/theme/tokens';
import { Icon, type IconName } from './icon';

/** Horizontal green gradient used for the website's header bars. */
export function HeaderGradient({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <View style={[styles.gradientWrap, style]}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="hdr" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color.headerStart} />
            <Stop offset="1" stopColor={color.headerEnd} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hdr)" />
      </Svg>
      {children}
    </View>
  );
}

/** Green page header with back button (website `.atz-page-header`). */
export function PageHeader({
  title,
  subtitle,
  back = true,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <HeaderGradient style={{ paddingTop: insets.top + space.sm }}>
      <View style={styles.pageHeaderRow}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.headerIconBtn}>
            <Icon name="back" size={22} color={color.onHeader} />
          </Pressable>
        ) : null}
        <View style={styles.flex}>
          <Text style={styles.pageTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.pageSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </HeaderGradient>
  );
}

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';

export function Button({
  label,
  onPress,
  variant = 'filled',
  icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg =
    variant === 'filled' ? color.onPrimary : variant === 'tonal' ? color.onPrimaryContainer : color.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** MD3 outlined text field. */
export function TextField({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={color.onSurfaceVariant}
        {...props}
        style={[styles.field, props.multiline && styles.fieldMulti, style]}
      />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({
  icon = 'box',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={36} color={color.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyText}>{message}</Text> : null}
      {action}
    </View>
  );
}

export function LoginPrompt({ message = 'Log in to see your orders, addresses and more.' }: { message?: string }) {
  return (
    <EmptyState
      icon="user"
      title="You're not logged in"
      message={message}
      action={<Button label="Log in / Sign up" onPress={() => router.push('/login')} />}
    />
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={color.primary} />
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      {selected ? <Icon name="check" size={16} color={color.onPrimaryContainer} /> : null}
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  gradientWrap: { overflow: 'hidden' },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    minHeight: 56,
  },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { ...type.titleLarge, color: color.onHeader },
  pageSubtitle: { ...type.bodySmall, color: color.onHeaderMuted, marginTop: 2 },
  button: {
    minHeight: TOUCH,
    borderRadius: shape.full,
    paddingHorizontal: space.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  filled: { backgroundColor: color.primary },
  tonal: { backgroundColor: color.primaryContainer },
  outlined: { borderWidth: 1, borderColor: color.outline },
  text: { paddingHorizontal: space.md },
  buttonDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonLabel: { ...type.labelLarge },
  fieldWrap: { gap: 6 },
  fieldLabel: { ...type.labelMedium, color: color.onSurfaceVariant },
  field: {
    minHeight: TOUCH + 4,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    borderRadius: shape.small,
    paddingHorizontal: space.lg,
    backgroundColor: color.surfaceContainerLowest,
    fontFamily: font.body,
    fontSize: 16,
    color: color.onSurface,
  },
  fieldMulti: { minHeight: 88, paddingTop: space.md, textAlignVertical: 'top' },
  card: {
    backgroundColor: color.surfaceContainerLowest,
    borderRadius: shape.medium,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    padding: space.lg,
  },
  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: space.xxl, gap: space.sm },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: color.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  emptyTitle: { ...type.titleMedium, color: color.onSurface, textAlign: 'center' },
  emptyText: { ...type.bodyMedium, color: color.onSurfaceVariant, textAlign: 'center', marginBottom: space.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  chip: {
    minHeight: 36,
    borderRadius: shape.small,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.surfaceContainerLowest,
  },
  chipSelected: { backgroundColor: color.primaryContainer, borderColor: color.primaryOutline },
  chipLabel: { ...type.labelMedium, color: color.onSurfaceVariant },
  chipLabelSelected: { color: color.onPrimaryContainer },
});
