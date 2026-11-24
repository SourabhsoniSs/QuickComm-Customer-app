import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { useDeliveryLocation, type SavedAddress } from '@/context/location';
import { color, font, shape, space, type } from '@/theme/tokens';
import { Icon } from './icon';

/** MD3 modal bottom sheet for picking the delivery location (website LocationDrawer). */
export function LocationSheet({
  visible,
  onClose,
  dismissable = true,
}: {
  visible: boolean;
  onClose: () => void;
  dismissable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { detectLocation, isFetching, savedAddresses, setLocation } = useDeliveryLocation();
  const [error, setError] = useState('');

  const useCurrent = async () => {
    setError('');
    const res = await detectLocation();
    if (res.ok) onClose();
    else setError(res.error || 'Could not get your location');
  };

  const pick = (a: SavedAddress) => {
    if (!a.location) {
      setError('This address has no map location. Edit it in Saved addresses, or use your current location.');
      return;
    }
    setLocation({
      name: a.address,
      city: a.raw?.city,
      state: a.raw?.state,
      pincode: a.raw?.pincode,
      latitude: a.location.lat,
      longitude: a.location.lng,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismissable ? onClose : () => {}}>
      <Pressable style={styles.scrim} onPress={dismissable ? onClose : undefined} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Select delivery location</Text>
        <Text style={styles.subtitle}>We use it to show shops and prices near you.</Text>

        <Pressable
          accessibilityRole="button"
          onPress={useCurrent}
          disabled={isFetching}
          style={({ pressed }) => [styles.current, pressed && styles.pressed]}>
          <View style={styles.currentIcon}>
            {isFetching ? <ActivityIndicator color={color.primary} /> : <Icon name="location" size={22} color={color.primary} />}
          </View>
          <View style={styles.flex}>
            <Text style={styles.currentTitle}>{isFetching ? 'Detecting location…' : 'Use current location'}</Text>
            <Text style={styles.currentSub}>Using GPS</Text>
          </View>
          <Icon name="arrow" size={16} color={color.primary} />
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {savedAddresses.length > 0 ? (
          <>
            <Text style={styles.section}>Saved addresses</Text>
            <ScrollView style={styles.list}>
              {savedAddresses.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  onPress={() => pick(a)}
                  style={({ pressed }) => [styles.address, pressed && styles.pressed]}>
                  <Icon name="pin" size={20} color={color.onSurfaceVariant} />
                  <View style={styles.flex}>
                    <Text style={styles.addrLabel}>{a.label}</Text>
                    <Text style={styles.addrText} numberOfLines={2}>
                      {a.address}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {isAuthenticated ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              router.push('/addresses');
            }}
            style={styles.manage}>
            <Icon name="plus" size={18} color={color.primary} />
            <Text style={styles.manageText}>Add or manage addresses</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: color.scrim },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: shape.extraLarge,
    borderTopRightRadius: shape.extraLarge,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    maxHeight: '80%',
  },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: color.outline, marginVertical: space.md },
  title: { ...type.headlineSmall, color: color.onSurface },
  subtitle: { ...type.bodyMedium, color: color.onSurfaceVariant, marginTop: 4, marginBottom: space.lg },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: shape.large,
    backgroundColor: color.primaryContainer,
  },
  currentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  currentTitle: { fontFamily: font.bodyBold, fontSize: 15, color: color.onPrimaryContainer },
  currentSub: { ...type.bodySmall, color: color.onSurfaceVariant },
  error: { ...type.bodySmall, color: color.error, marginTop: space.sm },
  section: { ...type.labelLarge, color: color.onSurfaceVariant, marginTop: space.xl, marginBottom: space.sm },
  list: { flexGrow: 0 },
  address: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
    minHeight: 56,
  },
  addrLabel: { fontFamily: font.bodyBold, fontSize: 14, color: color.onSurface },
  addrText: { ...type.bodySmall, color: color.onSurfaceVariant, marginTop: 2 },
  manage: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, marginTop: space.sm },
  manageText: { fontFamily: font.bodyBold, fontSize: 14, color: color.primary },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
});
