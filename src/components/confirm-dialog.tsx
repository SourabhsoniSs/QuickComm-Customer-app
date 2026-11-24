import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { color, font, shape, space, type } from '@/theme/tokens';
import { Icon, type IconName } from './icon';

/** MD3 basic dialog in the app's style; replaces the platform Alert. */
export function ConfirmDialog({
  visible,
  icon = 'info',
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  icon?: IconName;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const accent = destructive ? color.error : color.primary;
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(150)} style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} accessibilityLabel="Close dialog" />
        <Animated.View entering={ZoomIn.duration(200)} style={styles.dialog} accessibilityRole="alert">
          <View style={[styles.iconWrap, { backgroundColor: destructive ? color.errorContainer : color.primaryContainer }]}>
            <Icon name={icon} size={26} color={accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onCancel}
              style={({ pressed }) => [styles.btn, styles.cancel, pressed && styles.pressed]}>
              <Text style={[styles.btnText, { color: color.onSurface }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onConfirm}
              style={({ pressed }) => [styles.btn, { backgroundColor: accent }, (pressed || loading) && styles.pressed]}>
              <Text style={[styles.btnText, { color: '#ffffff' }]}>{loading ? 'Please wait…' : confirmLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: color.scrim, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: color.surface,
    borderRadius: shape.extraLarge,
    padding: space.xxl,
    alignItems: 'center',
  },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  title: { ...type.headlineSmall, color: color.onSurface, textAlign: 'center' },
  message: { ...type.bodyMedium, color: color.onSurfaceVariant, textAlign: 'center', marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.xxl, alignSelf: 'stretch' },
  btn: { flex: 1, minHeight: 48, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  cancel: { borderWidth: 1, borderColor: color.outlineVariant, backgroundColor: '#ffffff' },
  btnText: { fontFamily: font.bodyBold, fontSize: 14 },
  pressed: { opacity: 0.8 },
});
