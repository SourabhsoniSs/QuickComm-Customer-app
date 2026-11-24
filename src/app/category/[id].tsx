import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { ProductGrid } from '@/components/product-grid';
import { EmptyState, Loading, PageHeader } from '@/components/ui';
import { useGeoParams } from '@/context/location';
import { useAsync } from '@/hooks/use-async';
import { customerApi, listFrom } from '@/lib/api';
import { cloudinary, FALLBACK_CATEGORY_IMAGE, onlyInStock, toCardProduct, type Product } from '@/lib/product';
import { color, font, space } from '@/theme/tokens';

type Resolved = { title: string; filterKey: string; tabKey: string; filterId: string; tabs: any[]; preselect?: string };

/** Resolve a header / category / subcategory id the same way the website does. */
function resolve(tree: any[], id: string): Resolved {
  if (id === 'all') return { title: 'All products', filterKey: '', tabKey: '', filterId: '', tabs: [] };
  for (const header of tree) {
    if (header._id === id) {
      return { title: header.name, filterKey: 'headerId', tabKey: 'categoryId', filterId: id, tabs: header.children || [] };
    }
    for (const cat of header.children || []) {
      if (cat._id === id) {
        return { title: cat.name, filterKey: 'categoryId', tabKey: 'subcategoryId', filterId: id, tabs: cat.children || [] };
      }
      const sub = (cat.children || []).find((s: any) => s._id === id);
      if (sub) {
        return {
          title: cat.name,
          filterKey: 'categoryId',
          tabKey: 'subcategoryId',
          filterId: cat._id,
          tabs: cat.children || [],
          preselect: sub._id,
        };
      }
    }
  }
  return { title: 'Products', filterKey: 'categoryId', tabKey: 'subcategoryId', filterId: id, tabs: [] };
}

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const geo = useGeoParams();
  const [tree, setTree] = useState<any[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    customerApi
      .getCategories({ tree: true })
      .then((r) => setTree(r.data?.results || r.data?.result || []))
      .catch(() => setTree([]));
  }, []);

  const resolved = useMemo(() => (tree ? resolve(tree, String(id)) : null), [tree, id]);

  const selected = picked ?? resolved?.preselect ?? 'all';
  const setSelected = setPicked;

  const fetchProducts = useCallback(async (): Promise<Product[] | null> => {
    if (!resolved) return null;
    if (!geo) return [];
    const params: Record<string, any> = { limit: 100, ...geo };
    if (resolved.filterKey) params[resolved.filterKey] = resolved.filterId;
    if (selected !== 'all' && resolved.tabKey) params[resolved.tabKey] = selected;
    try {
      const r = await customerApi.getProducts(params);
      return onlyInStock(listFrom(r.data).map(toCardProduct));
    } catch {
      return [];
    }
  }, [resolved, geo, selected]);
  const productState = useAsync(fetchProducts);
  const products = productState.loading ? null : (productState.data ?? null);
  const load = productState.reload;

  const tabs = resolved?.tabs || [];

  return (
    <View style={styles.screen}>
      <PageHeader title={resolved?.title || 'Loading…'} subtitle={products ? `${products.length} items` : undefined} />
      {tabs.length > 0 ? (
        <View style={styles.tabsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {[{ _id: 'all', name: 'All', image: null }, ...tabs].map((t: any, i: number) => {
              const isSel = selected === t._id;
              return (
                <Pressable
                  key={t._id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSel }}
                  onPress={() => setSelected(t._id)}
                  style={styles.tab}>
                  <View style={[styles.tile, { backgroundColor: color.tileTints[i % 4] }, isSel && styles.tileSel]}>
                    <Image
                      source={cloudinary(t.image || FALLBACK_CATEGORY_IMAGE, 'f_auto,q_auto,w_120')}
                      style={styles.tileImg}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={[styles.tabText, isSel && styles.tabTextSel]} numberOfLines={2}>
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {products === null ? (
        <Loading />
      ) : (
        <ProductGrid
          products={products}
          bottomInset={insets.bottom + 80}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          header={<View style={{ height: space.md }} />}
          empty={
            <EmptyState
              title={geo ? 'No products here yet' : 'Set your delivery location'}
              message={geo ? 'Check back soon or explore other categories.' : 'Pick a location on the Home tab first.'}
            />
          }
        />
      )}
      <CartBar bottom={insets.bottom + 12} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  tabsBar: { borderBottomWidth: 1, borderBottomColor: color.divider },
  tabs: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 11 },
  tab: { width: 72 },
  tile: {
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  tileSel: { borderColor: color.primary },
  tileImg: { width: '80%', height: '80%' },
  tabText: { fontFamily: font.bodyMedium, fontSize: 10, lineHeight: 14, color: color.onSurface, textAlign: 'center' },
  tabTextSel: { fontFamily: font.bodyBold, color: color.primary },
});
