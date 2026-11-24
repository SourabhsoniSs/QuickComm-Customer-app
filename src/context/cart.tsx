import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { customerApi } from '@/lib/api';
import { getAvailableStock, resolveVariantPricing, unitPrice, type Product } from '@/lib/product';
import { getJSON, KEYS, removeKey, setJSON } from '@/lib/storage';
import { useAuth } from './auth';
import { useSnackbar } from './snackbar';

type CartValue = {
  cart: Product[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product) => void;
  updateQuantity: (productId: string, delta: number, variantSku?: string) => void;
  removeFromCart: (productId: string, variantSku?: string) => void;
  clearCart: () => Promise<void>;
  reload: () => Promise<void>;
};

const CartContext = createContext<CartValue | null>(null);

const keyOf = (item: Product) => `${item.id || item._id}::${String(item.variantSku || '').trim()}`;

function normalizeBackendCart(items: any[]): Product[] {
  return (items || [])
    .filter((it) => it?.productId)
    .map((it) => {
      const product = it.productId;
      const variantSku = String(it.variantSku || '').trim();
      const { price, salePrice, variantName } = resolveVariantPricing(product, variantSku);
      return {
        ...product,
        id: product._id,
        quantity: it.quantity,
        variantSku,
        variantName,
        price,
        salePrice,
        image: product.mainImage,
      };
    });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const snackbar = useSnackbar();
  const [cart, setCart] = useState<Product[]>([]);
  const pending = useRef(0);
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const fetchCart = useCallback(async () => {
    try {
      const res = await customerApi.getCart();
      setCart(normalizeBackendCart(res.data?.result?.items));
    } catch {}
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      removeKey(KEYS.cart);
      customerApi
        .getCart()
        .then((res) => setCart(normalizeBackendCart(res.data?.result?.items)))
        .catch(() => {});
    } else {
      getJSON<Product[]>(KEYS.cart, []).then((c) => setCart(Array.isArray(c) ? c : []));
    }
  }, [isAuthenticated]);

  // Guests keep the cart on the device
  useEffect(() => {
    if (isAuthenticated) return;
    const t = setTimeout(() => setJSON(KEYS.cart, cart), 300);
    return () => clearTimeout(t);
  }, [cart, isAuthenticated]);

  /** Runs a server call; syncs from its response unless more calls are in flight. */
  const sync = useCallback(
    async (call: () => Promise<any>) => {
      if (!isAuthenticated) return;
      pending.current += 1;
      try {
        const res = await call();
        pending.current -= 1;
        if (pending.current === 0) setCart(normalizeBackendCart(res.data?.result?.items));
      } catch (e: any) {
        pending.current -= 1;
        if (e?.response?.data?.message) snackbar(e.response.data.message, 'error');
        if (pending.current === 0) fetchCart();
      }
    },
    [isAuthenticated, fetchCart, snackbar],
  );

  const warnStock = useCallback(
    (max: number) => snackbar(max > 0 ? `Only ${max} available` : 'Out of stock', 'error'),
    [snackbar],
  );

  const removeFromCart = useCallback(
    (productId: string, variantSku = '') => {
      const sku = String(variantSku || '').trim();
      const key = `${productId}::${sku}`;
      setCart((prev) => prev.filter((i) => keyOf(i) !== key));
      sync(() => customerApi.removeFromCart(productId, sku));
    },
    [sync],
  );

  const addToCart = useCallback(
    (product: Product) => {
      const variantSku = String(product?.variantSku || product?.variantName || '').trim();
      const id = product.id || product._id;
      const key = `${id}::${variantSku}`;
      const inCart = cartRef.current.find((i) => keyOf(i) === key);
      const max = getAvailableStock(inCart ? { ...product, ...inCart } : product, variantSku);
      if ((inCart?.quantity || 0) + 1 > max) {
        warnStock(max);
        return;
      }
      const { price, salePrice, variantName } = resolveVariantPricing(product, variantSku);
      setCart((prev) => {
        if (prev.some((i) => keyOf(i) === key)) {
          return prev.map((i) => (keyOf(i) === key ? { ...i, quantity: i.quantity + 1 } : i));
        }
        return [
          ...prev,
          { ...product, id, variantSku, variantName, price, salePrice, quantity: 1, image: product.image || product.mainImage },
        ];
      });
      sync(() => customerApi.addToCart({ productId: id, variantSku, quantity: 1 }));
    },
    [sync, warnStock],
  );

  const updateQuantity = useCallback(
    (productId: string, delta: number, variantSku = '') => {
      const sku = String(variantSku || '').trim();
      const key = `${productId}::${sku}`;
      const item = cartRef.current.find((i) => keyOf(i) === key);
      if (!item) return;
      const next = Math.max(0, item.quantity + delta);
      const max = getAvailableStock(item, sku);
      if (delta > 0 && next > max) {
        warnStock(max);
        return;
      }
      if (next === 0) {
        removeFromCart(productId, sku);
        return;
      }
      setCart((prev) => prev.map((i) => (keyOf(i) === key ? { ...i, quantity: next } : i)));
      sync(() => customerApi.updateCartQuantity({ productId, quantity: next, variantSku: sku }));
    },
    [sync, removeFromCart, warnStock],
  );

  const clearCart = useCallback(async () => {
    setCart([]);
    if (isAuthenticated) {
      try {
        await customerApi.clearCart();
      } catch {}
    }
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      cart,
      cartCount: cart.reduce((n, i) => n + Number(i.quantity || 0), 0),
      cartTotal: cart.reduce((n, i) => n + unitPrice(i) * Number(i.quantity || 0), 0),
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      reload: fetchCart,
    }),
    [cart, addToCart, updateQuantity, removeFromCart, clearCart, fetchCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

/** Quantity of one product/variant in the cart (cheap selector for cards). */
export function useCartQuantity(productId: string, variantSku = '') {
  const { cart } = useCart();
  const key = `${productId}::${String(variantSku || '').trim()}`;
  return cart.find((i) => keyOf(i) === key)?.quantity ?? 0;
}
