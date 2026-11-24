import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ProductGrid } from '@/components/product-grid';
import { EmptyState, HeaderGradient } from '@/components/ui';
import { useGeoParams } from '@/context/location';
import { useAsync } from '@/hooks/use-async';
import { customerApi, listFrom } from '@/lib/api';
import { toCardProduct, type Product } from '@/lib/product';
import { color, font, space, type } from '@/theme/tokens';

const SUGGESTIONS = ['Milk', 'Bread', 'Chips', 'Atta', 'Eggs', 'Fruits', 'Cold drinks', 'Masala'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const geo = useGeoParams();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [popular, setPopular] = useState<Product[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Popular products to browse before typing
  useEffect(() => {
    if (!geo) return;
    customerApi
      .getProducts({ limit: 40, ...geo })
      .then((r) => setPopular(listFrom(r.data).map(toCardProduct)))
      .catch(() => {});
  }, [geo]);

  // Server search (out-of-stock included, greyed out — same as the website)
  const fetchResults = useCallback(async (): Promise<Product[] | null> => {
    if (!debounced || !geo) return null;
    try {
      const r = await customerApi.getProducts({ search: debounced, limit: 100, includeOutOfStock: true, ...geo });
      return listFrom(r.data).map(toCardProduct);
    } catch {
      return [];
    }
  }, [debounced, geo]);
  const search = useAsync(fetchResults);
  const loading = Boolean(debounced) && search.loading;
  const results = debounced ? (search.data ?? null) : null;

  const list = results ?? popular;

  const header = useMemo(
    () => (
      <View style={styles.listHeader}>
        {results === null ? (
          <>
            <Text style={styles.sectionTitle}>Trending searches</Text>
            <View style={styles.chips}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.chip} onPress={() => setQuery(s)} accessibilityRole="button">
                  <Icon name="search" size={14} color={color.onSurfaceVariant} />
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
            {popular.length ? <Text style={styles.sectionTitle}>Popular near you</Text> : null}
          </>
        ) : (
          <Text style={styles.resultCount}>
            {results.length} result{results.length === 1 ? '' : 's'} for “{debounced}”
          </Text>
        )}
      </View>
    ),
    [results, popular.length, debounced],
  );

  return (
    <View style={styles.screen}>
      <HeaderGradient style={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <View style={styles.box}>
          <Icon name="search" color="#71806c" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for products"
            placeholderTextColor={color.onSurfaceVariant}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search products"
          />
          {loading ? (
            <ActivityIndicator color={color.primary} />
          ) : query ? (
            <Pressable accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
              <Icon name="close" size={18} color="#71806c" />
            </Pressable>
          ) : null}
        </View>
      </HeaderGradient>
      {!geo ? (
        <EmptyState icon="pin" title="Set your delivery location" message="Pick a location on the Home tab to search shops near you." />
      ) : (
        <ProductGrid
          products={list}
          header={header}
          bottomInset={120}
          empty={results !== null && !loading ? <EmptyState icon="search" title="No products found" message="Try a different word." /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  box: {
    backgroundColor: color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#dae5d4',
  },
  input: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.onSurface, paddingVertical: 10 },
  listHeader: { paddingHorizontal: 6, paddingTop: space.lg },
  sectionTitle: { ...type.titleMedium, color: color.onSurface, marginBottom: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: '#ffffff',
  },
  chipText: { ...type.labelMedium, color: color.onSurface },
  resultCount: { ...type.bodyMedium, color: color.onSurfaceVariant, marginBottom: space.sm },
});
