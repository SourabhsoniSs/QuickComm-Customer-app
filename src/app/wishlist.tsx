import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { ProductGrid } from '@/components/product-grid';
import { Button, EmptyState, PageHeader } from '@/components/ui';
import { useWishlist } from '@/context/wishlist';
import { toCardProduct } from '@/lib/product';
import { color } from '@/theme/tokens';

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const { wishlist, fetchFull } = useWishlist();

  useEffect(() => {
    fetchFull();
  }, [fetchFull]);

  // ids-only entries (before the full fetch lands) have no name to show
  const products = useMemo(() => wishlist.filter((p) => p.name).map(toCardProduct), [wishlist]);

  return (
    <View style={{ flex: 1, backgroundColor: color.surface }}>
      <PageHeader title="My Wishlist" subtitle={`${products.length} saved`} />
      <ProductGrid
        products={products}
        bottomInset={insets.bottom + 80}
        header={<View style={{ height: 12 }} />}
        empty={
          <EmptyState
            icon="heart"
            title="Your wishlist is empty"
            message="Tap the heart on any product to save it here."
            action={<Button label="Browse products" onPress={() => router.navigate('/')} />}
          />
        }
      />
      <CartBar bottom={insets.bottom + 12} />
    </View>
  );
}
