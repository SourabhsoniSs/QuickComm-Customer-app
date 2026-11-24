import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Shelf } from '@/components/shelf';
import { Button, EmptyState, Loading } from '@/components/ui';
import { useCart, useCartQuantity } from '@/context/cart';
import { useGeoParams } from '@/context/location';
import { useSnackbar } from '@/context/snackbar';
import { useWishlist } from '@/context/wishlist';
import { customerApi, errorMessage, listFrom } from '@/lib/api';
import {
  cloudinary,
  defaultVariant,
  getAvailableStock,
  isProductOutOfStock,
  isVariantOutOfStock,
  onlyInStock,
  rupees,
  toCardProduct,
  type Product,
} from '@/lib/product';
import { color, font, shape, space, type } from '@/theme/tokens';

const stripHtml = (html?: string) =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const geo = useGeoParams();
  const snackbar = useSnackbar();
  const { addToCart, updateQuantity } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [pickedVariant, setVariantKey] = useState<string | null>(null);
  const variantKey = pickedVariant ?? (product ? defaultVariant(product)?.key || '' : '');

  useEffect(() => {
    let cancelled = false;
    customerApi
      .getProductById(String(id), geo ?? undefined)
      .then((r) => {
        if (cancelled) return;
        const p = r.data?.result;
        if (!p) throw new Error('Product not found');
        setProduct(toCardProduct(p));
      })
      .catch((e) => !cancelled && setError(errorMessage(e, 'Product not found')));
    customerApi
      .getProductReviews(String(id))
      .then((r) => !cancelled && setReviews(r.data?.result || r.data?.results || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, geo]);

  // Related: same category
  useEffect(() => {
    const categoryId = product?.categoryId?._id || product?.categoryId;
    if (!categoryId || !geo) return;
    customerApi
      .getProducts({ categoryId, limit: 12, ...geo })
      .then((r) =>
        setRelated(onlyInStock(listFrom(r.data).map(toCardProduct)).filter((p) => String(p.id) !== String(product?.id))),
      )
      .catch(() => {});
  }, [product, geo]);

  const productId = String(product?.id || id);
  const quantity = useCartQuantity(productId, variantKey);
  const saved = isInWishlist(productId);

  const images = useMemo(() => {
    if (!product) return [];
    const list = [product.image, ...(Array.isArray(product.galleryImages) ? product.galleryImages : [])];
    return [...new Set(list.filter(Boolean))] as string[];
  }, [product]);

  if (error) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <BackButton />
        <EmptyState icon="info" title="Couldn't open this product" message={error} />
      </View>
    );
  }
  if (!product) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <BackButton />
        <Loading />
      </View>
    );
  }

  const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
  const variant = variants.find((v) => String(v?.sku || v?.name || '').trim() === variantKey);
  const vMrp = Number(variant?.mrp || 0);
  const vSale = Number(variant?.sellingPrice || 0);
  const price = variant ? (vSale > 0 && vSale < vMrp ? vSale : vMrp) : Number(product.price || 0);
  const mrp = variant ? (vSale > 0 && vSale < vMrp ? vMrp : null) : Number(product.originalPrice) > price ? Number(product.originalPrice) : null;
  const discount = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const shopClosed = product.store?.isOpen === false;
  const outOfStock = shopClosed || (variant ? isVariantOutOfStock(variant) : isProductOutOfStock(product));
  const max = getAvailableStock(product, variantKey);
  const description = stripHtml(product.description);
  const rating = reviews.length ? reviews.reduce((n, r) => n + Number(r.rating || 0), 0) / reviews.length : 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={[styles.gallery, { paddingTop: insets.top }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
            {images.map((uri) => (
              <Image key={uri} source={cloudinary(uri, 'f_auto,q_auto,w_800')} style={{ width, height: width * 0.85 }} contentFit="contain" transition={150} />
            ))}
          </ScrollView>
          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((uri, i) => (
                <View key={`dot-${uri}`} style={[styles.dot, i === imageIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
          <View style={[styles.topActions, { top: insets.top + space.sm }]}>
            <BackButton floating />
            <Pressable
              accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}
              style={styles.roundBtn}
              onPress={() => {
                toggleWishlist(product);
                snackbar(saved ? 'Removed from wishlist' : 'Added to wishlist');
              }}>
              <Icon name="heart" size={20} color={saved ? color.heart : color.onSurface} fill={saved ? color.heartFill : 'none'} />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.deliveryPill}>
            <Icon name="truck" size={13} color={color.onPrimaryContainer} />
            <Text style={styles.deliveryText}>
              {shopClosed ? `Shop closed${product.store?.message ? ` · ${product.store.message}` : ''}` : product.deliveryTime || '8–15 mins'}
            </Text>
          </View>
          <Text style={styles.name}>{product.name}</Text>
          {product.brand ? <Text style={styles.brand}>{String(product.brand?.name || product.brand)}</Text> : null}
          {reviews.length ? (
            <Text style={styles.rating}>
              ★ {rating.toFixed(1)} · {reviews.length} review{reviews.length > 1 ? 's' : ''}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{rupees(price)}</Text>
            {mrp ? <Text style={styles.mrp}>MRP {rupees(mrp)}</Text> : null}
            {discount > 0 ? (
              <View style={styles.discount}>
                <Text style={styles.discountText}>{discount}% OFF</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.tax}>(Inclusive of all taxes)</Text>

          {variants.length > 0 ? (
            <>
              <Text style={styles.section}>Select unit</Text>
              <View style={styles.variants}>
                {variants.map((v) => {
                  const key = String(v?.sku || v?.name || '').trim();
                  const sel = key === variantKey;
                  const soldOut = isVariantOutOfStock(v);
                  const vm = Number(v?.mrp || 0);
                  const vs = Number(v?.sellingPrice || 0);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: sel, disabled: soldOut }}
                      disabled={soldOut}
                      onPress={() => setVariantKey(key)}
                      style={[styles.variant, sel && styles.variantSel, soldOut && styles.variantOut]}>
                      <Text style={[styles.variantName, sel && styles.variantNameSel]}>{v.name}</Text>
                      <Text style={styles.variantPrice}>{rupees(vs > 0 && vs < vm ? vs : vm)}</Text>
                      {soldOut ? <Text style={styles.soldOut}>Sold out</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={styles.unit}>{product.weight}</Text>
          )}

          {description ? (
            <>
              <Text style={styles.section}>Product details</Text>
              <Text style={styles.description}>{description}</Text>
            </>
          ) : null}

          {reviews.length ? (
            <>
              <Text style={styles.section}>Customer reviews</Text>
              {reviews.slice(0, 5).map((r, i) => (
                <View key={r._id || i} style={styles.review}>
                  <Text style={styles.reviewHead}>
                    {'★'.repeat(Math.round(Number(r.rating || 0)))} {r.userId?.name || r.customer?.name || 'Customer'}
                  </Text>
                  {r.comment ? <Text style={styles.reviewText}>{r.comment}</Text> : null}
                </View>
              ))}
            </>
          ) : null}
        </View>

        <Shelf title="You might also like" products={related} />
      </ScrollView>

      {/* Sticky add-to-cart bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.flex}>
          <Text style={styles.barPrice}>{rupees(price)}</Text>
          <Text style={styles.barUnit} numberOfLines={1}>
            {variant?.name || product.weight}
          </Text>
        </View>
        {quantity > 0 ? (
          <View style={styles.qty}>
            <Pressable accessibilityLabel="Remove one" style={styles.qtyBtn} onPress={() => updateQuantity(productId, -1, variantKey)}>
              <Text style={styles.qtyText}>−</Text>
            </Pressable>
            <Text style={styles.qtyText}>{quantity}</Text>
            <Pressable
              accessibilityLabel="Add one"
              disabled={quantity >= max}
              style={[styles.qtyBtn, quantity >= max && { opacity: 0.35 }]}
              onPress={() => updateQuantity(productId, 1, variantKey)}>
              <Text style={styles.qtyText}>+</Text>
            </Pressable>
          </View>
        ) : (
          <Button
            label={shopClosed ? 'Shop closed' : outOfStock ? 'Out of stock' : 'Add to cart'}
            disabled={outOfStock}
            onPress={() => addToCart({ ...product, variantSku: variantKey, variantName: variant?.name || '' })}
            style={styles.addBtn}
          />
        )}
        {quantity > 0 ? <Button label="View cart" variant="tonal" onPress={() => router.push('/checkout')} style={styles.viewCart} /> : null}
      </View>
    </View>
  );
}

function BackButton({ floating }: { floating?: boolean }) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      style={floating ? styles.roundBtn : styles.plainBack}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      <Icon name="back" size={22} color={color.onSurface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1 },
  gallery: { backgroundColor: color.surfaceContainerLow },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.outlineVariant },
  dotActive: { width: 16, backgroundColor: color.primary },
  topActions: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  plainBack: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', margin: space.sm },
  body: { padding: space.xl, gap: 6 },
  deliveryPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: color.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: shape.full,
  },
  deliveryText: { ...type.labelSmall, color: color.onPrimaryContainer },
  name: { ...type.headlineSmall, color: color.onSurface, marginTop: 6 },
  brand: { ...type.bodyMedium, color: color.onSurfaceVariant },
  rating: { ...type.labelMedium, color: color.secondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  price: { fontFamily: font.display, fontSize: 24, color: color.onSurface },
  mrp: { ...type.bodyMedium, color: color.onSurfaceVariant, textDecorationLine: 'line-through' },
  discount: { backgroundColor: color.primary, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  discountText: { fontFamily: font.bodyBold, fontSize: 10, color: '#ffffff' },
  tax: { ...type.bodySmall, color: color.onSurfaceVariant },
  section: { ...type.titleMedium, color: color.onSurface, marginTop: space.xl, marginBottom: space.sm },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  variant: {
    minWidth: 96,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    borderRadius: shape.medium,
    padding: space.md,
    backgroundColor: '#ffffff',
  },
  variantSel: { borderColor: color.primary, borderWidth: 2, backgroundColor: color.primaryContainer },
  variantOut: { opacity: 0.5 },
  variantName: { ...type.labelLarge, color: color.onSurface },
  variantNameSel: { color: color.onPrimaryContainer },
  variantPrice: { ...type.bodySmall, color: color.onSurfaceVariant, marginTop: 2 },
  soldOut: { ...type.labelSmall, color: color.error },
  unit: { ...type.bodyMedium, color: color.onSurfaceVariant },
  description: { ...type.bodyMedium, color: color.onSurfaceVariant },
  review: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.divider },
  reviewHead: { ...type.labelMedium, color: color.onSurface },
  reviewText: { ...type.bodyMedium, color: color.onSurfaceVariant, marginTop: 2 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: '#e9ece2',
  },
  barPrice: { fontFamily: font.display, fontSize: 18, color: color.onSurface },
  barUnit: { ...type.bodySmall, color: color.onSurfaceVariant },
  addBtn: { minWidth: 150, borderRadius: 9 },
  viewCart: { borderRadius: 9, paddingHorizontal: space.lg },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.primaryOutline,
    backgroundColor: color.primaryContainer,
    borderRadius: 9,
  },
  qtyBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: font.bodyBold, fontSize: 15, color: color.onPrimaryContainer, minWidth: 18, textAlign: 'center' },
});
