import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { customerApi } from '@/lib/api';
import type { Product } from '@/lib/product';
import { getJSON, KEYS, removeKey, setJSON } from '@/lib/storage';
import { useAuth } from './auth';

type WishlistValue = {
  wishlist: Product[];
  isInWishlist: (id: string) => boolean;
  toggleWishlist: (product: Product) => void;
  fetchFull: () => Promise<void>;
};

const WishlistContext = createContext<WishlistValue | null>(null);

const fromBackend = (products: any[]) =>
  (products || []).map((p) => (typeof p === 'string' ? { id: p, _id: p } : { ...p, id: p._id, image: p.mainImage }));

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      removeKey(KEYS.wishlist);
      customerApi
        .getWishlist({ idsOnly: true })
        .then((res) => setWishlist(fromBackend(res.data?.result?.products)))
        .catch(() => {});
    } else {
      getJSON<Product[]>(KEYS.wishlist, []).then(setWishlist);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) setJSON(KEYS.wishlist, wishlist);
  }, [wishlist, isAuthenticated]);

  const fetchFull = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await customerApi.getWishlist({ idsOnly: false });
      setWishlist(fromBackend(res.data?.result?.products));
    } catch {}
  }, [isAuthenticated]);

  const ids = useMemo(() => new Set(wishlist.map((p) => String(p.id || p._id))), [wishlist]);
  const isInWishlist = useCallback((id: string) => ids.has(String(id)), [ids]);

  const toggleWishlist = useCallback(
    (product: Product) => {
      const id = String(product.id || product._id);
      const saved = ids.has(id);
      // optimistic
      setWishlist((prev) => (saved ? prev.filter((p) => String(p.id || p._id) !== id) : [...prev, { ...product, id }]));
      if (!isAuthenticated) return;
      const call = saved ? customerApi.removeFromWishlist(id) : customerApi.addToWishlist({ productId: id });
      call.then((res) => setWishlist(fromBackend(res.data?.result?.products))).catch(() => {});
    },
    [ids, isAuthenticated],
  );

  const value = useMemo(() => ({ wishlist, isInWishlist, toggleWishlist, fetchFull }), [wishlist, isInWishlist, toggleWishlist, fetchFull]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
