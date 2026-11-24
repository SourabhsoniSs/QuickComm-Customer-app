import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';
import { Button, Card, EmptyState, Loading, PageHeader } from '@/components/ui';
import { useSnackbar } from '@/context/snackbar';
import { useAsync } from '@/hooks/use-async';
import { customerApi, errorMessage } from '@/lib/api';
import { cloudinary, formatDateTime, getOrderBucket, getOrderStatusLabel, ORDER_STEPS, rupees } from '@/lib/product';
import { color, font, shape, space, type } from '@/theme/tokens';

const STEP_LABELS: Record<string, string> = {
  pending: 'Order placed',
  confirmed: 'Confirmed by shop',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();
  const snackbar = useSnackbar();
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    const result = (await customerApi.getOrderDetails(String(orderId))).data?.result;
    return result?.order || result;
  }, [orderId]);
  const { data: order, error: loadError, reload: load, setData: setOrder } = useAsync<any>(fetchOrder);
  const error = loadError ? errorMessage(loadError, 'Order not found') : '';

  const bucket = getOrderBucket(order);
  const active = order && bucket !== 'delivered' && bucket !== 'cancelled';

  // Live-ish updates: refresh while the order is still moving
  useEffect(() => {
    if (!active) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [active, load]);

  if (error && !order) {
    return (
      <View style={styles.screen}>
        <PageHeader title="Order" />
        <EmptyState icon="info" title="Order not found" message={error} />
      </View>
    );
  }
  if (!order) {
    return (
      <View style={styles.screen}>
        <PageHeader title="Order" />
        <Loading />
      </View>
    );
  }

  const cancellable =
    Number(order.workflowVersion) >= 2
      ? String(order.workflowStatus || '').toUpperCase() === 'SELLER_PENDING'
      : order.status === 'pending';
  const stepIndex = ORDER_STEPS.indexOf(bucket);
  const otpRaw = order.activeDeliveryOtp;
  const otp = typeof otpRaw === 'string' || typeof otpRaw === 'number' ? String(otpRaw) : otpRaw?.otp || otpRaw?.code;
  const p = order.pricing || {};
  const rider = order.deliveryBoy && typeof order.deliveryBoy === 'object' ? order.deliveryBoy : null;

  const cancel = () => setCancelOpen(true);

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      const r = await customerApi.cancelOrder(order.orderId, { reason: 'Cancelled by customer' });
      if (r.data?.result) setOrder(r.data.result);
      else await load();
      snackbar('Order cancelled');
    } catch (e) {
      snackbar(errorMessage(e, 'Failed to cancel order'), 'error');
    } finally {
      setCancelling(false);
      setCancelOpen(false);
    }
  };

  return (
    <View style={styles.screen}>
      <PageHeader title={`Order #${String(order.orderId).slice(-6)}`} subtitle={formatDateTime(order.createdAt)} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
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
        }>
        {/* Status */}
        <Card style={bucket === 'cancelled' ? styles.cancelledCard : styles.statusCard}>
          <Text style={[styles.statusLabel, bucket === 'cancelled' && { color: '#be123c' }]}>{getOrderStatusLabel(order)}</Text>
          {bucket !== 'cancelled' ? (
            <View style={styles.steps}>
              {ORDER_STEPS.map((s, i) => {
                const done = i <= stepIndex;
                return (
                  <View key={s} style={styles.step}>
                    <View style={styles.stepRail}>
                      <View style={[styles.stepDot, done && styles.stepDotDone]}>
                        {done ? <Icon name="check" size={12} color="#ffffff" strokeWidth={3} /> : null}
                      </View>
                      {i < ORDER_STEPS.length - 1 ? <View style={[styles.stepLine, i < stepIndex && styles.stepLineDone]} /> : null}
                    </View>
                    <Text style={[styles.stepText, done && styles.stepTextDone]}>{STEP_LABELS[s]}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Card>

        {otp && active ? (
          <Card style={styles.otpCard}>
            <Text style={styles.otpTitle}>Delivery OTP</Text>
            <Text style={styles.otpText}>Share this code with the delivery partner when your order arrives.</Text>
            <Text style={styles.otp}>{otp}</Text>
          </Card>
        ) : null}

        {rider && active ? (
          <Card>
            <View style={styles.row}>
              <Icon name="truck" size={22} color={color.primary} />
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{rider.name || 'Delivery partner'}</Text>
                <Text style={styles.muted}>Your delivery partner</Text>
              </View>
              {rider.phone ? <Button label="Call" variant="tonal" icon="bell" onPress={() => Linking.openURL(`tel:${rider.phone}`)} /> : null}
            </View>
          </Card>
        ) : null}

        {/* Items */}
        <Card style={styles.noPad}>
          <Text style={[styles.cardTitle, styles.padded]}>{(order.items || []).length} items</Text>
          {(order.items || []).map((item: any, i: number) => (
            <View key={`${item.name}-${i}`} style={styles.item}>
              <View style={styles.thumb}>
                {item.image ? (
                  <Image source={cloudinary(item.image)} style={styles.thumbImg} contentFit="contain" />
                ) : (
                  <Icon name="box" size={20} color={color.onSurfaceVariant} />
                )}
              </View>
              <View style={styles.flex}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.muted}>
                  {item.variantName ? `${item.variantName} · ` : ''}Qty {item.quantity}
                </Text>
              </View>
              <Text style={styles.itemPrice}>{rupees(Number(item.price || 0) * Number(item.quantity || 1))}</Text>
            </View>
          ))}
        </Card>

        {/* Bill */}
        <Card>
          <Text style={styles.cardTitle}>Bill summary</Text>
          <Row label="Item total" value={rupees(p.subtotal ?? 0)} />
          <Row label="Delivery fee" value={Number(p.deliveryFee || 0) ? rupees(p.deliveryFee) : 'FREE'} />
          {Number(p.handlingFee || 0) ? <Row label="Handling fee" value={rupees(p.handlingFee)} /> : null}
          {Number(p.tax || p.taxTotal || 0) ? <Row label="Taxes" value={rupees(p.tax || p.taxTotal)} /> : null}
          {Number(p.discount || p.discountTotal || 0) ? <Row label="Discount" value={`-${rupees(p.discount || p.discountTotal)}`} /> : null}
          {Number(p.tip || 0) ? <Row label="Tip" value={rupees(p.tip)} /> : null}
          {Number(p.walletAmount || 0) ? <Row label="Wallet" value={`-${rupees(p.walletAmount)}`} /> : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{rupees(p.total ?? 0)}</Text>
          </View>
          <Text style={styles.muted}>
            Paid via {order.payment?.method === 'cash' ? 'Cash on delivery' : String(order.payment?.method || 'online')}
            {order.paymentStatus ? ` · ${String(order.paymentStatus).toLowerCase()}` : ''}
          </Text>
        </Card>

        {/* Address */}
        {order.address ? (
          <Card>
            <View style={styles.row}>
              <Icon name="pin" size={20} color={color.primary} />
              <Text style={styles.cardTitle}>Delivering to {order.address.name}</Text>
            </View>
            <Text style={[styles.muted, { marginTop: space.sm }]}>
              {[order.address.address, order.address.landmark, order.address.city].filter(Boolean).join(', ')}
            </Text>
            {order.address.phone ? <Text style={styles.muted}>{order.address.phone}</Text> : null}
          </Card>
        ) : null}

        {cancellable ? <Button label="Cancel order" variant="outlined" onPress={cancel} loading={cancelling} /> : null}
      </ScrollView>

      <ConfirmDialog
        visible={cancelOpen}
        icon="close"
        title="Cancel this order?"
        message="This cancels your order and refunds any amount paid online. This cannot be undone."
        confirmLabel="Cancel order"
        cancelLabel="Go back"
        destructive
        loading={cancelling}
        onCancel={() => setCancelOpen(false)}
        onConfirm={confirmCancel}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.billRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.billValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1, minWidth: 0 },
  content: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  statusCard: { backgroundColor: '#f3f9ee', borderColor: '#c5d9b6' },
  cancelledCard: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  statusLabel: { ...type.titleLarge, color: color.primary, marginBottom: space.md },
  steps: { gap: 0 },
  step: { flexDirection: 'row', gap: space.md, minHeight: 40 },
  stepRail: { alignItems: 'center', width: 22 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: color.outlineVariant,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: color.primary, borderColor: color.primary },
  stepLine: { flex: 1, width: 2, backgroundColor: color.outlineVariant },
  stepLineDone: { backgroundColor: color.primary },
  stepText: { ...type.bodyMedium, color: color.onSurfaceVariant, paddingTop: 1 },
  stepTextDone: { fontFamily: font.bodyBold, color: color.onSurface },
  otpCard: { alignItems: 'center', backgroundColor: color.primaryContainer, borderColor: color.primaryOutline },
  otpTitle: { ...type.titleMedium, color: color.onPrimaryContainer },
  otpText: { ...type.bodySmall, color: color.onSurfaceVariant, textAlign: 'center', marginTop: 4 },
  otp: { fontFamily: font.display, fontSize: 34, letterSpacing: 10, color: color.primary, marginTop: space.md },
  noPad: { padding: 0 },
  padded: { padding: space.lg, paddingBottom: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: shape.small,
    backgroundColor: color.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: 40, height: 40 },
  itemName: { fontFamily: font.bodySemi, fontSize: 13, color: color.onSurface },
  itemPrice: { ...type.labelLarge, color: color.onSurface },
  cardTitle: { ...type.titleSmall, color: color.onSurface },
  muted: { ...type.bodySmall, color: color.onSurfaceVariant },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  billValue: { ...type.labelLarge, color: color.onSurface },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.divider,
    marginBottom: space.sm,
  },
  totalLabel: { ...type.titleMedium, color: color.onSurface },
  totalValue: { fontFamily: font.display, fontSize: 18, color: color.primary },
});
