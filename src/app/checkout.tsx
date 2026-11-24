import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { LocationSheet } from '@/components/location-sheet';
import { Button, Card, Chip, EmptyState, LoginPrompt, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { useDeliveryLocation } from '@/context/location';
import { useSettings } from '@/context/settings';
import { useSnackbar } from '@/context/snackbar';
import { customerApi, errorMessage } from '@/lib/api';
import { cloudinary, getAvailableStock, rupees, unitPrice } from '@/lib/product';
import { color, font, shape, space, type } from '@/theme/tokens';

const TIPS = [
  { value: 0, label: 'No tip' },
  { value: 10, label: '₹10' },
  { value: 20, label: '₹20' },
  { value: 30, label: '₹30' },
];

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const snackbar = useSnackbar();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { cart, cartTotal, updateQuantity, clearCart } = useCart();
  const { currentLocation } = useDeliveryLocation();

  const [chosenPayment, setPayment] = useState<'cash' | 'online'>('cash');
  const [tip, setTip] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [coupon, setCoupon] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [rawPreview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [codUnavailable, setCodUnavailable] = useState('');
  const [placing, setPlacing] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  // Receiver details default to the profile until the customer edits them
  const [recipientEdits, setRecipientEdits] = useState<{ name?: string; phone?: string; landmark?: string }>({});
  const recipient = {
    name: recipientEdits.name ?? String(user?.name || ''),
    phone: recipientEdits.phone ?? String(user?.phone || '').replace(/^\+?91/, ''),
    landmark: recipientEdits.landmark ?? '',
  };
  const setRecipient = (update: (r: typeof recipient) => typeof recipient) => setRecipientEdits(update(recipient));
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    customerApi
      .getActiveCoupons()
      .then((r) => setCoupons(r.data?.result || r.data?.results || []))
      .catch(() => {});
  }, [isAuthenticated]);

  const paymentMethods = useMemo(
    () => [
      ...(settings.onlineEnabled === false ? [] : [{ id: 'online' as const, label: 'Pay online', sub: 'UPI / Cards / NetBanking', icon: 'wallet' as const }]),
      ...(settings.codEnabled === false || codUnavailable ? [] : [{ id: 'cash' as const, label: 'Cash on delivery', sub: 'Pay after delivery', icon: 'truck' as const }]),
    ],
    [settings.onlineEnabled, settings.codEnabled, codUnavailable],
  );

  // Fall back to an available method when the chosen one is switched off
  const payment = paymentMethods.some((m) => m.id === chosenPayment) ? chosenPayment : (paymentMethods[0]?.id ?? chosenPayment);

  const address = useMemo(() => {
    if (!currentLocation) return null;
    return {
      type: 'Home',
      name: recipient.name || user?.name || 'Customer',
      phone: recipient.phone,
      address: currentLocation.name,
      landmark: recipient.landmark,
      city: [currentLocation.city, currentLocation.state, currentLocation.pincode].filter(Boolean).join(', '),
      location: { lat: currentLocation.latitude, lng: currentLocation.longitude },
    };
  }, [currentLocation, recipient.name, recipient.phone, recipient.landmark, user?.name]);

  const walletBalance = Number(user?.walletBalance || 0);
  const walletAmount = useWallet ? Math.min(walletBalance, Number(rawPreview?.grossTotal ?? rawPreview?.grandTotal ?? cartTotal)) : 0;

  // Server-priced preview, debounced like the website
  const canPreview = isAuthenticated && cart.length > 0 && Boolean(address);
  const preview = canPreview ? rawPreview : null;
  useEffect(() => {
    if (!canPreview) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await customerApi.checkoutPreview({
          items: cart.map((i) => ({
            product: i.id || i._id,
            name: i.name,
            variantSku: String(i.variantSku || '').trim(),
            quantity: i.quantity,
            image: i.image,
          })),
          address,
          tipAmount: tip,
          walletAmount,
          paymentMode: payment === 'online' ? 'ONLINE' : 'COD',
          timeSlot: 'now',
          ...(coupon?.code ? { couponCode: String(coupon.code).trim() } : {}),
          ...(coupon?.couponId || coupon?._id ? { couponId: String(coupon.couponId || coupon._id) } : {}),
        });
        if (res.data?.success) {
          setPreview(res.data.result?.breakdown ?? null);
          setCodUnavailable(res.data.result?.codUnavailableReason || '');
          setPreviewError('');
        } else {
          setPreview(null);
          setPreviewError(res.data?.message || "We couldn't work out the charges for this order.");
        }
      } catch (e) {
        setPreview(null);
        setPreviewError(errorMessage(e, "We couldn't work out the charges right now. Please try again."));
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [canPreview, cart, address, tip, walletAmount, payment, coupon]);

  const applyCoupon = async (code: string, base?: any) => {
    if (!code.trim()) return snackbar('Please enter a coupon code', 'error');
    try {
      const res = await customerApi.validateCoupon({ code: code.trim(), cartTotal, items: cart, customerId: user?._id });
      if (res.data?.success) {
        setCoupon({ ...(base || { code: code.trim() }), ...res.data.result });
        snackbar(`Coupon ${code.trim()} applied!`, 'success');
      } else snackbar(res.data?.message || 'Invalid coupon', 'error');
    } catch (e) {
      snackbar(errorMessage(e, 'Invalid coupon'), 'error');
    }
  };

  const serverPayable = Number(preview?.payableAmount ?? preview?.grandTotal ?? 0);
  const toPay = Number(preview?.walletAmount || 0) > 0 ? serverPayable : Math.max(0, serverPayable - walletAmount);
  const discount = Number(preview?.discountTotal ?? (coupon ? coupon.discountAmount || coupon.discount || 0 : 0));

  const placeOrder = async () => {
    if (!address) return setLocationOpen(true);
    if (recipient.phone.replace(/\D/g, '').length !== 10) return snackbar('Enter a 10-digit phone number for delivery', 'error');
    setPlacing(true);
    try {
      const res = await customerApi.createOrder({
        address,
        paymentMode: payment === 'online' ? 'ONLINE' : 'COD',
        tipAmount: tip,
        timeSlot: 'now',
        walletAmount,
        ...(coupon?.code ? { couponCode: String(coupon.code).trim() } : {}),
        ...(coupon?.couponId || coupon?._id ? { couponId: String(coupon.couponId || coupon._id) } : {}),
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not place order.');
      const result = res.data.result;
      const main = result.order || (Array.isArray(result.orders) ? result.orders[0] : null);
      const orderId = main?.orderId || result.orderId;
      const paymentRef = result.paymentRef || result.checkoutGroupId || orderId;
      if (!orderId) {
        snackbar('Order placed. Opening your orders…');
        router.replace('/orders');
        return;
      }

      if (payment === 'online') {
        await clearCart();
        try {
          const payRes = await customerApi.createPaymentOrder({ orderRef: paymentRef, orderId });
          const pay = payRes.data?.result || {};
          if (payRes.data?.success && pay.checkout?.provider === 'razorpay') {
            router.replace({
              pathname: '/payment',
              params: {
                orderId,
                merchantOrderId: String(pay.merchantOrderId || ''),
                checkout: JSON.stringify({ ...pay.checkout, description: `Order #${orderId}`, prefill: { name: recipient.name, contact: recipient.phone } }),
              },
            });
            return;
          }
          if (payRes.data?.success && pay.redirectUrl) {
            await WebBrowser.openBrowserAsync(pay.redirectUrl);
            router.replace({ pathname: '/order/[orderId]', params: { orderId } });
            return;
          }
          throw new Error(payRes.data?.message || 'Failed to start payment');
        } catch (e: any) {
          snackbar(e?.message || 'Order created but payment failed. Pay from the order page.', 'error');
          router.replace({ pathname: '/order/[orderId]', params: { orderId } });
          return;
        }
      }

      // Cash on delivery
      await clearCart();
      refreshUser();
      setSuccessId(orderId);
      setTimeout(() => router.replace({ pathname: '/order/[orderId]', params: { orderId } }), 2500);
    } catch (e: any) {
      snackbar(errorMessage(e, e?.message || 'Failed to place order. Please try again.'), 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <PageHeader title="Checkout" />
        <LoginPrompt message="Log in to place your order. Your cart is saved." />
      </View>
    );
  }

  if (!cart.length && !successId) {
    return (
      <View style={styles.screen}>
        <PageHeader title="Checkout" />
        <EmptyState
          icon="bag"
          title="Your cart is empty"
          message="Add items to your cart to place an order."
          action={<Button label="Browse products" onPress={() => router.navigate('/')} />}
        />
      </View>
    );
  }

  const charge = (v: any, free = true) =>
    previewLoading ? '…' : !preview ? '—' : Number(v || 0) === 0 && free ? 'FREE' : rupees(v);

  return (
    <View style={styles.screen}>
      <PageHeader title="Checkout" subtitle={`${cart.length} item${cart.length > 1 ? 's' : ''} · delivery in ${settings.estimatedDeliveryTime}`} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        {/* Delivery address */}
        <Card>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Icon name="pin" size={20} color={color.primary} />
              <Text style={styles.cardTitle}>Delivery address</Text>
            </View>
            <Pressable onPress={() => setLocationOpen(true)} hitSlop={8}>
              <Text style={styles.link}>Change</Text>
            </Pressable>
          </View>
          <Text style={styles.address}>{currentLocation?.name || 'No delivery location set'}</Text>
          <View style={styles.inputs}>
            <TextInput
              style={styles.input}
              placeholder="Receiver name"
              placeholderTextColor={color.onSurfaceVariant}
              value={recipient.name}
              onChangeText={(name) => setRecipient((r) => ({ ...r, name }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (10 digits)"
              placeholderTextColor={color.onSurfaceVariant}
              keyboardType="phone-pad"
              maxLength={10}
              value={recipient.phone}
              onChangeText={(p) => setRecipient((r) => ({ ...r, phone: p.replace(/\D/g, '') }))}
            />
            <TextInput
              style={styles.input}
              placeholder="House no. / landmark (optional)"
              placeholderTextColor={color.onSurfaceVariant}
              value={recipient.landmark}
              onChangeText={(landmark) => setRecipient((r) => ({ ...r, landmark }))}
            />
          </View>
        </Card>

        {/* Items */}
        <Card style={styles.noPad}>
          {cart.map((item, i) => {
            const id = String(item.id || item._id);
            const sku = String(item.variantSku || '');
            const max = getAvailableStock(item, sku);
            return (
              <View key={`${id}::${sku}`} style={[styles.item, i < cart.length - 1 && styles.divider]}>
                <View style={styles.thumb}>
                  <Image source={cloudinary(item.image || item.mainImage)} style={styles.thumbImg} contentFit="contain" />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemUnit}>{item.variantName || item.weight || '1 unit'}</Text>
                  <Text style={styles.itemPrice}>{rupees(unitPrice(item) * item.quantity)}</Text>
                </View>
                <View style={styles.qty}>
                  <Pressable accessibilityLabel="Remove one" style={styles.qtyBtn} onPress={() => updateQuantity(id, -1, sku)}>
                    <Text style={styles.qtyText}>−</Text>
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable
                    accessibilityLabel="Add one"
                    disabled={item.quantity >= max}
                    style={[styles.qtyBtn, item.quantity >= max && { opacity: 0.35 }]}
                    onPress={() => updateQuantity(id, 1, sku)}>
                    <Text style={styles.qtyText}>+</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Coupons */}
        <Card>
          <View style={styles.row}>
            <Icon name="tag" size={20} color={color.primary} />
            <Text style={styles.cardTitle}>Coupons & offers</Text>
          </View>
          {coupon ? (
            <View style={styles.applied}>
              <Text style={styles.appliedText}>“{coupon.code}” applied{discount ? ` · you save ${rupees(discount)}` : ''}</Text>
              <Pressable onPress={() => setCoupon(null)} hitSlop={8}>
                <Text style={[styles.link, { color: color.error }]}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.couponRow}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Enter coupon code"
                  placeholderTextColor={color.onSurfaceVariant}
                  autoCapitalize="characters"
                  value={couponCode}
                  onChangeText={setCouponCode}
                />
                <Button label="Apply" variant="tonal" onPress={() => applyCoupon(couponCode)} style={styles.applyBtn} />
              </View>
              {coupons.slice(0, 4).map((c) => (
                <Pressable key={c._id || c.code} style={styles.couponItem} onPress={() => applyCoupon(c.code, c)}>
                  <View style={styles.flex}>
                    <Text style={styles.couponCode}>{c.code}</Text>
                    {c.description ? <Text style={styles.itemUnit}>{c.description}</Text> : null}
                  </View>
                  <Text style={styles.link}>Apply</Text>
                </Pressable>
              ))}
            </>
          )}
        </Card>

        {/* Tip */}
        <Card>
          <Text style={styles.cardTitle}>Tip your delivery partner</Text>
          <View style={styles.chips}>
            {TIPS.map((t) => (
              <Chip key={t.value} label={t.label} selected={tip === t.value} onPress={() => setTip(t.value)} />
            ))}
          </View>
        </Card>

        {/* Payment */}
        <Card>
          <Text style={styles.cardTitle}>Payment method</Text>
          {codUnavailable ? <Text style={styles.warn}>{codUnavailable}</Text> : null}
          {paymentMethods.map((m) => {
            const sel = payment === m.id;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                onPress={() => setPayment(m.id)}
                style={[styles.payment, sel && styles.paymentSel]}>
                <Icon name={m.icon} size={22} color={sel ? color.primary : color.onSurfaceVariant} />
                <View style={styles.flex}>
                  <Text style={styles.payLabel}>{m.label}</Text>
                  <Text style={styles.itemUnit}>{m.sub}</Text>
                </View>
                <View style={[styles.radio, sel && styles.radioSel]}>{sel ? <View style={styles.radioDot} /> : null}</View>
              </Pressable>
            );
          })}
          {walletBalance > 0 ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: useWallet }}
              onPress={() => setUseWallet((v) => !v)}
              style={[styles.payment, useWallet && styles.paymentSel]}>
              <Icon name="wallet" size={22} color={useWallet ? color.primary : color.onSurfaceVariant} />
              <View style={styles.flex}>
                <Text style={styles.payLabel}>Use wallet balance</Text>
                <Text style={styles.itemUnit}>Available {rupees(walletBalance)}</Text>
              </View>
              <View style={[styles.checkbox, useWallet && styles.checkboxOn]}>
                {useWallet ? <Icon name="check" size={14} color="#ffffff" strokeWidth={3} /> : null}
              </View>
            </Pressable>
          ) : null}
        </Card>

        {/* Bill */}
        <Card>
          <Text style={styles.cardTitle}>Bill details</Text>
          <BillRow label="Item total" value={rupees(preview?.productSubtotal ?? cartTotal)} />
          <BillRow label="Delivery fee" value={charge(preview?.deliveryFeeCharged)} />
          <BillRow label="Handling fee" value={charge(preview?.handlingFeeCharged)} />
          <BillRow label="Taxes" value={charge(preview?.taxTotal, false)} />
          {discount > 0 ? <BillRow label="Coupon discount" value={`-${rupees(discount)}`} accent /> : null}
          {Number(preview?.tipTotal || tip) > 0 ? <BillRow label="Tip" value={rupees(preview?.tipTotal || tip)} /> : null}
          {walletAmount > 0 ? <BillRow label="Wallet" value={`-${rupees(walletAmount)}`} accent /> : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>To pay</Text>
            <Text style={styles.totalValue}>{previewLoading ? 'Calculating…' : preview ? rupees(Math.round(toPay)) : '—'}</Text>
          </View>
          {previewError ? <Text style={styles.warn}>{previewError}</Text> : null}
        </Card>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space.md }]}>
        <View>
          <Text style={styles.barTotal}>{preview ? rupees(Math.round(toPay)) : rupees(cartTotal)}</Text>
          <Text style={styles.itemUnit}>{payment === 'online' ? 'Pay online' : 'Cash on delivery'}</Text>
        </View>
        <Button
          label={payment === 'online' ? 'Proceed to pay' : 'Place order'}
          onPress={placeOrder}
          loading={placing}
          disabled={!preview || previewLoading || !paymentMethods.length}
          style={styles.placeBtn}
        />
      </View>

      <LocationSheet visible={locationOpen} onClose={() => setLocationOpen(false)} />

      <Modal visible={Boolean(successId)} transparent animationType="fade">
        <View style={styles.successScrim}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Icon name="check" size={40} color="#ffffff" strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>Order placed!</Text>
            <Text style={styles.successText}>Waiting for the shop to accept your order…</Text>
            <ActivityIndicator color={color.primary} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BillRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={styles.billLabel}>{label}</Text>
      <Text style={[styles.billValue, accent && { color: color.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1, minWidth: 0 },
  content: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...type.titleSmall, color: color.onSurface },
  link: { fontFamily: font.bodyBold, fontSize: 13, color: color.primary },
  address: { ...type.bodyMedium, color: color.onSurfaceVariant, marginTop: space.sm },
  inputs: { gap: space.sm, marginTop: space.md },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    borderRadius: shape.small,
    paddingHorizontal: space.md,
    fontFamily: font.body,
    fontSize: 15,
    color: color.onSurface,
    backgroundColor: '#ffffff',
  },
  noPad: { padding: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: color.divider },
  thumb: { width: 56, height: 56, borderRadius: shape.small, backgroundColor: color.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  thumbImg: { width: 48, height: 48 },
  itemName: { fontFamily: font.bodySemi, fontSize: 13, color: color.onSurface },
  itemUnit: { ...type.bodySmall, color: color.onSurfaceVariant },
  itemPrice: { fontFamily: font.bodyBold, fontSize: 13, color: color.onSurface, marginTop: 2 },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.primaryOutline,
    backgroundColor: color.primaryContainer,
    borderRadius: 9,
  },
  qtyBtn: { minWidth: 36, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: font.bodyBold, fontSize: 14, color: color.onPrimaryContainer, minWidth: 16, textAlign: 'center' },
  applied: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: shape.small,
    backgroundColor: color.primaryContainer,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  appliedText: { ...type.labelMedium, color: color.onPrimaryContainer, flex: 1 },
  couponRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md, alignItems: 'center' },
  applyBtn: { borderRadius: shape.small, minHeight: 46 },
  couponItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: color.divider,
    marginTop: space.sm,
  },
  couponCode: { fontFamily: font.bodyBold, fontSize: 14, letterSpacing: 1, color: color.onSurface },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  warn: { ...type.bodySmall, color: color.error, marginTop: space.sm },
  payment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: shape.medium,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    marginTop: space.sm,
    minHeight: 56,
  },
  paymentSel: { borderColor: color.primary, backgroundColor: '#f3f9ee' },
  payLabel: { ...type.labelLarge, color: color.onSurface },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.outline, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: color.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: color.outline, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: color.primary, borderColor: color.primary },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  billLabel: { ...type.bodyMedium, color: color.onSurfaceVariant },
  billValue: { ...type.labelLarge, color: color.onSurface },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.divider,
  },
  totalLabel: { ...type.titleMedium, color: color.onSurface },
  totalValue: { fontFamily: font.display, fontSize: 20, color: color.primary },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: '#e9ece2',
  },
  barTotal: { fontFamily: font.display, fontSize: 20, color: color.onSurface },
  placeBtn: { flex: 1, maxWidth: 220, borderRadius: 12 },
  successScrim: { flex: 1, backgroundColor: color.scrim, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  successCard: {
    width: '100%',
    backgroundColor: color.surface,
    borderRadius: shape.extraLarge,
    padding: space.xxl,
    alignItems: 'center',
    gap: space.md,
  },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' },
  successTitle: { ...type.headlineSmall, color: color.onSurface },
  successText: { ...type.bodyMedium, color: color.onSurfaceVariant, textAlign: 'center' },
});
