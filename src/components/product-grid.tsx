import { FlashList } from '@shopify/flash-list';
import { useCallback, type ReactElement } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import type { Product } from '@/lib/product';
import { color } from '@/theme/tokens';
import { ProductCard } from './product-card';

const keyOf = (p: Product) => String(p.id || p._id);

/** Virtualized two-column product grid (website `.results-grid`). */
export function ProductGrid({
  products,
  header,
  empty,
  refreshing,
  onRefresh,
  bottomInset = 0,
}: {
  products: Product[];
  header?: ReactElement | null;
  empty?: ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  bottomInset?: number;
}) {
  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.cell}>
        <ProductCard product={item} fill />
      </View>
    ),
    [],
  );
  return (
    <FlashList
      data={products}
      numColumns={2}
      renderItem={renderItem}
      keyExtractor={keyOf}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 24 }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} colors={[color.primary]} />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, padding: 6 },
});
