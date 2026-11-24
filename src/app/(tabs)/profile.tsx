import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';

import { Icon, type IconName } from '@/components/icon';
import { LoginPrompt, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { API_BASE_URL } from '@/lib/api';
import { rupees } from '@/lib/product';
import { color, font, shape, space, type } from '@/theme/tokens';

const MENU: { icon: IconName; label: string; sub: string; href: Href }[] = [
  { icon: 'bag', label: 'My orders', sub: 'Track, return or reorder', href: '/orders' },
  { icon: 'heart', label: 'Wishlist', sub: 'Products you saved', href: '/wishlist' },
  { icon: 'pin', label: 'Saved addresses', sub: 'Manage delivery addresses', href: '/addresses' },
  { icon: 'wallet', label: 'Wallet', sub: 'Balance & transactions', href: '/wallet' },
  { icon: 'bell', label: 'Notifications', sub: 'Order updates & offers', href: '/notifications' },
];

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <PageHeader title="Profile" back={false} />
        <LoginPrompt />
      </View>
    );
  }

  const initials = String(user?.name || 'C')
    .split(' ')
    .map((s: string) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const confirmLogout = () => setLogoutOpen(true);

  return (
    <View style={styles.screen}>
      <PageHeader title="Profile" back={false}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || 'Customer'}
            </Text>
            <Text style={styles.phone}>{user?.phone ? `+91 ${String(user.phone).replace(/^\+?91/, '')}` : ''}</Text>
          </View>
          <Pressable accessibilityLabel="Edit profile" style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
            <Icon name="edit" size={18} color={color.onHeader} />
          </Pressable>
        </View>
      </PageHeader>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.wallet} onPress={() => router.push('/wallet')} accessibilityRole="button">
          <Icon name="wallet" size={22} color={color.onPrimaryContainer} />
          <View style={styles.flex}>
            <Text style={styles.walletLabel}>Wallet balance</Text>
            <Text style={styles.walletValue}>{rupees(user?.walletBalance ?? 0)}</Text>
          </View>
          <Icon name="arrow" size={16} color={color.onPrimaryContainer} />
        </Pressable>

        <View style={styles.list}>
          {MENU.map((m, i) => (
            <Pressable
              key={m.label}
              accessibilityRole="button"
              onPress={() => router.push(m.href)}
              style={({ pressed }) => [styles.item, i < MENU.length - 1 && styles.divider, pressed && { opacity: 0.7 }]}>
              <View style={styles.itemIcon}>
                <Icon name={m.icon} size={20} color={color.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.itemLabel}>{m.label}</Text>
                <Text style={styles.itemSub}>{m.sub}</Text>
              </View>
              <Icon name="arrow" size={16} color={color.onSurfaceVariant} />
            </Pressable>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={confirmLogout} style={[styles.list, styles.item]}>
          <View style={[styles.itemIcon, { backgroundColor: color.errorContainer }]}>
            <Icon name="logout" size={20} color={color.error} />
          </View>
          <Text style={[styles.itemLabel, { color: color.error }]}>Log out</Text>
        </Pressable>

        <Text style={styles.server}>Server: {API_BASE_URL}</Text>
      </ScrollView>

      <ConfirmDialog
        visible={logoutOpen}
        icon="logout"
        title="Log out?"
        message="You can log back in anytime with your phone number."
        confirmLabel="Log out"
        destructive
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          logout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1, minWidth: 0 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingBottom: space.xl },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fffef3', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.display, fontSize: 20, color: color.primary },
  name: { ...type.titleLarge, color: color.onHeader },
  phone: { ...type.bodySmall, color: color.onHeaderMuted, marginTop: 2 },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.21)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: space.lg, gap: space.lg, paddingBottom: 140 },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: shape.large,
    backgroundColor: color.primaryContainer,
  },
  walletLabel: { ...type.bodySmall, color: color.onPrimaryContainer },
  walletValue: { fontFamily: font.display, fontSize: 20, color: color.onPrimaryContainer },
  list: { backgroundColor: '#ffffff', borderRadius: shape.large, borderWidth: 1, borderColor: color.outlineVariant },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 64 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.divider },
  itemIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { ...type.titleSmall, color: color.onSurface },
  itemSub: { ...type.bodySmall, color: color.onSurfaceVariant, marginTop: 1 },
  server: { ...type.labelSmall, color: color.outline, textAlign: 'center' },
});
