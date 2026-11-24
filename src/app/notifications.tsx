import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { EmptyState, Loading, PageHeader } from '@/components/ui';
import { customerApi, listFrom } from '@/lib/api';
import { formatDateTime } from '@/lib/product';
import { color, shape, space, type } from '@/theme/tokens';

export default function NotificationsScreen() {
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    customerApi
      .getNotifications({ limit: 50 })
      .then((r) => {
        const data = r.data?.result;
        setItems(Array.isArray(data?.notifications) ? data.notifications : listFrom(r.data));
        customerApi.markNotificationsRead().catch(() => {});
      })
      .catch(() => setItems([]));
  }, []);

  return (
    <View style={styles.screen}>
      <PageHeader title="Notifications" />
      {items === null ? (
        <Loading />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(n, i) => String(n._id || i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="bell" title="No notifications" message="Order updates and offers will show up here." />}
          renderItem={({ item }) => {
            const orderId = item.data?.orderId || item.orderId;
            return (
              <Pressable
                disabled={!orderId}
                onPress={() => router.push({ pathname: '/order/[orderId]', params: { orderId: String(orderId) } })}
                style={[styles.item, !item.isRead && !item.read && styles.unread]}>
                <View style={styles.icon}>
                  <Icon name="bell" size={18} color={color.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.title}>{item.title || 'Update'}</Text>
                  {item.message || item.body ? <Text style={styles.body}>{item.message || item.body}</Text> : null}
                  <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1, minWidth: 0 },
  list: { padding: space.lg },
  item: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: shape.medium,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: color.outlineVariant,
  },
  unread: { backgroundColor: '#f3f9ee', borderColor: '#c5d9b6' },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.titleSmall, color: color.onSurface },
  body: { ...type.bodySmall, color: color.onSurfaceVariant, marginTop: 2 },
  time: { ...type.labelSmall, color: color.outline, marginTop: 4 },
});
