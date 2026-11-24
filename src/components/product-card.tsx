import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCart, useCartQuantity } from '@/context/cart';
import { useSnackbar } from '@/context/snackbar';
import { useWishlist } from '@/context/wishlist';
import { cloudinary, defaultVariant, getAvailableStock, isProductOutOfStock, rupees, type Product } from '@/lib/product';
import { color, font, shape } from '@/theme/tokens';
import { Icon } from './icon';

/** Website `.atz .product-card`: 138px wide in rows, full width in grids. */
export const ProductCard = memo(function ProductCard({ product, fill }: { product: Product; fill?: boolean }) {
  const { addToCart, updateQuantity } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const snackbar = useSnackbar();

  const variant = useMemo(() => defaultVariant(product), [product]);
  const productId = String(product.id || product._id);
  const variantKey = variant?.key || '';
  const quantity = useCartQuantity(productId, variantKey);
  const max = getAvailableStock(product, variantKey);
  const saved = isInWishlist(productId);

  const lowestVariant = (Array.isArray(product.variants) ? product.variants : [])
    .map((v: any) => Number(v?.sellingPrice) || Number(v?.mrp) || 0)
    .filter((n: number) => n > 0)
    .sort((a: number, b: number) => a - b)[0];
  const price = variant?.displayPrice || product.price || lowestVariant;
  const mrp = variant?.displayOriginalPrice ?? (Number(product.originalPrice) > Number(price) ? product.originalPrice : null);
  const discount =
    variant?.discountPercent ||
    (mrp && price ? Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100) : 0);

  const shopClosed = product.store?.isOpen === false;
  const outOfStock = isProductOutOfStock(product) || shopClosed;
  const deliveryLine = shopClosed
    ? `Shop closed${product.store?.message ? ` · ${product.store.message}` : ''}`
    : outOfStock
      ? 'Currently unavailable'
      : product.store?.closingSoon || product.deliveryTime || '8–15 mins';

  const open = useCallback(() => {
    router.push({ pathname: '/product/[id]', params: { id: productId } });
  }, [productId]);

  const onAdd = useCallback(() => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length > 1) {
      open(); // let the customer pick a size
      return;
    }
    addToCart({ ...product, variantSku: variantKey, variantName: variant?.name || '' });
  }, [product, variantKey, variant?.name, addToCart, open]);

  const onToggleSave = useCallback(() => {
    toggleWishlist(product);
    snackbar(saved ? `${product.name} removed from wishlist` : `${product.name} added to wishlist`);
  }, [toggleWishlist, product, saved, snackbar]);

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={product.name}
      style={[styles.card, fill ? styles.fill : styles.fixed, outOfStock && !shopClosed && styles.soldOut]}>
      <View style={styles.visual}>
        <Image
          source={cloudinary(product.image || product.mainImage)}
          style={[styles.image, shopClosed && styles.faded]}
          contentFit="contain"
          transition={150}
          recyclingKey={productId}
        />
        {discount > 0 && !outOfStock ? (
          <View style={styles.discount}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${saved ? 'Unsave' : 'Save'} ${product.name}`}
          accessibilityState={{ selected: saved }}
          onPress={onToggleSave}
          hitSlop={6}
          style={styles.favorite}>
          <Icon
            name="heart"
            size={17}
            color={saved ? color.heart : '#657363'}
            fill={saved ? color.heartFill : 'none'}
          />
        </Pressable>
      </View>

      <View style={styles.deliveryRow}>
        <Icon name="truck" size={12} color={shopClosed ? color.error : '#486440'} />
        <Text style={[styles.delivery, shopClosed && styles.closed]} numberOfLines={1}>
          {deliveryLine}
        </Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.unit} numberOfLines={1}>
        {variant?.name || product.weight || '1 unit'}
      </Text>

      <View style={styles.bottom}>
        <View style={styles.priceCol}>
          {price ? <Text style={styles.price}>{rupees(price)}</Text> : <Text style={styles.unit}>See options</Text>}
          {mrp ? <Text style={styles.mrp}>{rupees(mrp)}</Text> : null}
        </View>
        {quantity > 0 ? (
          <View style={styles.qty} accessibilityLabel={`${product.name} quantity ${quantity}`}>
            <Pressable
              accessibilityLabel={`Remove one ${product.name}`}
              onPress={() => updateQuantity(productId, -1, variantKey)}
              style={styles.qtyBtn}>
              <Text style={styles.qtyText}>−</Text>
            </Pressable>
            <Text style={styles.qtyText}>{quantity}</Text>
            <Pressable
              accessibilityLabel={`Add one ${product.name}`}
              disabled={outOfStock || quantity >= max}
              onPress={() => updateQuantity(productId, 1, variantKey)}
              style={[styles.qtyBtn, (outOfStock || quantity >= max) && styles.disabled]}>
              <Text style={styles.qtyText}>+</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={outOfStock ? `${product.name} unavailable` : `Add ${product.name} to cart`}
            disabled={outOfStock}
            onPress={onAdd}
            hitSlop={{ top: 7, bottom: 7 }}
            style={[styles.add, outOfStock && styles.addDisabled]}>
            <Text style={styles.addText}>{shopClosed ? 'CLOSED' : 'ADD  +'}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: color.outlineVariant,
    borderRadius: shape.medium,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#25402a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  fixed: { width: 138 },
  fill: { flex: 1 },
  soldOut: { opacity: 0.6 },
  visual: {
    height: 95,
    borderRadius: shape.small,
    backgroundColor: color.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  image: { width: '90%', height: 80 },
  faded: { opacity: 0.5 },
  discount: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: color.primary,
    borderTopLeftRadius: 5,
    borderBottomRightRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  discountText: { fontFamily: font.display, fontSize: 9, color: '#ffffff' },
  favorite: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 1 },
  delivery: { fontFamily: font.body, fontSize: 9, color: '#486440', flexShrink: 1 },
  closed: { color: color.error, fontFamily: font.bodyBold, fontSize: 10 },
  name: { fontFamily: font.bodySemi, fontSize: 11.5, lineHeight: 15, color: color.onSurface, minHeight: 30 },
  unit: { fontFamily: font.body, fontSize: 10, color: '#63705f', marginTop: 1, marginBottom: 4 },
  bottom: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  priceCol: { gap: 1 },
  price: { fontFamily: font.bodyBold, fontSize: 13, color: color.onSurface },
  mrp: { fontFamily: font.body, fontSize: 10, color: '#697662', textDecorationLine: 'line-through' },
  add: {
    backgroundColor: color.primary,
    borderRadius: 6,
    paddingHorizontal: 9,
    minHeight: 30,
    justifyContent: 'center',
  },
  addDisabled: { backgroundColor: '#c9d2c4' },
  addText: { fontFamily: font.bodyBold, fontSize: 10, color: '#ffffff' },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.primaryOutline,
    backgroundColor: color.primaryContainer,
    borderRadius: 7,
  },
  qtyBtn: { minWidth: 28, minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: font.bodyBold, fontSize: 12, color: color.onPrimaryContainer, minWidth: 12, textAlign: 'center' },
  disabled: { opacity: 0.35 },
});
