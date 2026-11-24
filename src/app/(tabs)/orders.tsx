import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, EmptyState, Loading, LoginPrompt, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { customerApi, errorMessage, listFrom } from '@/lib/api';
import { cloudinary, formatDateTime, getOrderBucket, getOrderStatusLabel, rupees } from '@/lib/product';
import { color, font, shape, space, type } from '@/theme/tokens';

export default function OrdersScreen() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setError('');
      const r = await customerApi.getMyOrders();
      setOrders(listFrom(r.data));
    } catch (e) {
      setError(errorMessage(e));
      setOrders([]);
    }
  }, [isAuthenticated]);

  // Refresh whenever the tab is opened (statuses change live)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const renderItem = useCallback(({ item }: { item: any }) => <OrderRow order={item} />, []);

  return (
    <View style={styles.screen}>
      <PageHeader title="My Orders" back={false} />
      {!isAuthenticated ? (
        <LoginPrompt message="Log in to see your orders." />
      ) : orders === null ? (
        <Loading />
      ) : (
        <FlashList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(o) => String(o.orderId || o._id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              colors={[color.primary]}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
          ListEmptyComponent={
            error ? (
              <EmptyState icon="info" title="Couldn't load orders" message={error} />
            ) : (
              <EmptyState
                icon="bag"
                title="No orders yet"
                message="Your orders will show up here."
                action={<Button label="Start shopping" onPress={() => router.navigate('/')} />}
              />
            )
          }
        />
      )}
    </View>
  );
}

const OrderRow = memo(function OrderRow({ order }: { order: any }) {
  const bucket = getOrderBucket(order);
  const cancelled = bucket === 'cancelled';
  const items: any[] = order.items || [];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/order/[orderId]', params: { orderId: String(order.orderId) } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.top}>
        <View style={styles.thumb}>
          {items[0]?.image ? (
            <Image source={cloudinary(items[0].image)} style={styles.thumbImg} contentFit="contain" />
          ) : (
            <Icon name="box" size={22} color={color.onSurfaceVariant} />
          )}
        </View>
        <View style={styles.flex}>
          <Text style={styles.orderNo}>Order #{String(order.orderId || '').slice(-6)}</Text>
          <Text style={styles.date}>{formatDateTime(order.createdAt)}</Text>
          <View style={[styles.status, cancelled && styles.statusCancelled]}>
            <Icon name="check" size={10} color={cancelled ? '#be123c' : color.onPrimaryContainer} strokeWidth={2.5} />
            <Text style={[styles.statusText, cancelled && { color: '#be123c' }]} numberOfLines={2}>
              {getOrderStatusLabel(order).toUpperCase()}
            </Text>
          </View>
        </View>
        <Icon name="arrow" size={16} color={color.onSurfaceVariant} />
      </View>
      <View style={styles.bottom}>
        <Text style={styles.items} numberOfLines={1}>
          {items.map((i) => i.name).join(', ')}
        </Text>
        <Text style={styles.total}>{rupees(order.pricing?.total ?? 0)}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1, minWidth: 0 },
  list: { padding: space.lg, paddingBottom: 140 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: shape.large,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    padding: space.lg,
    marginBottom: space.md,
  },
  top: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', marginBottom: 14 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: shape.medium,
    backgroundColor: color.surfaceContainerLow,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: 40, height: 40 },
  orderNo: { ...type.titleSmall, color: color.onSurface },
  date: { ...type.bodySmall, color: color.onSurfaceVariant, marginTop: 2 },
  status: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: shape.full,
    backgroundColor: color.primaryContainer,
  },
  statusCancelled: { backgroundColor: '#fff1f2' },
  statusText: { fontFamily: font.bodySemi, fontSize: 10, letterSpacing: 0.8, color: color.onPrimaryContainer, flexShrink: 1 },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: color.divider,
    paddingTop: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
  },
  items: { ...type.bodySmall, color: color.onSurfaceVariant, flex: 1 },
  total: { ...type.titleSmall, color: color.onSurface },
});
