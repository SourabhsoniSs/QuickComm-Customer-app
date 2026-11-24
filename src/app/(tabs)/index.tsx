import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BannerCarousel,
  BenefitsStrip,
  CategoryRails,
  Collections,
  HomeFooter,
  openCategory,
  QuickCategories,
  TopCategories,
} from '@/components/home-sections';
import { Icon } from '@/components/icon';
import { LocationSheet } from '@/components/location-sheet';
import { Shelf } from '@/components/shelf';
import { EmptyState, HeaderGradient } from '@/components/ui';
import { useCart } from '@/context/cart';
import { useDeliveryLocation, useGeoParams } from '@/context/location';
import { useSettings } from '@/context/settings';
import { useAsync } from '@/hooks/use-async';
import { customerApi, errorMessage, listFrom } from '@/lib/api';
import { cloudinary, onlyInStock, savingPct, toCardProduct, type Product } from '@/lib/product';
import { color, font, space } from '@/theme/tokens';

const ALL = { _id: 'all', name: 'All', image: null as string | null };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const { cartCount } = useCart();
  const { currentLocation, hydrated, hasLocation, isFetching } = useDeliveryLocation();
  const geo = useGeoParams();

  const [locationOpen, setLocationOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<any>(ALL);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const isHeaderTab = activeTab._id !== 'all';

  const fetchStore = useCallback(async () => {
    const [catRes, prodRes, sectionsRes] = await Promise.all([
      customerApi.getCategories(),
      geo ? customerApi.getProducts({ limit: 20, ...geo }) : Promise.resolve(null),
      geo ? customerApi.getOfferSections({ ...geo, kind: 'offer' }).catch(() => null) : Promise.resolve(null),
    ]);
    const sections = sectionsRes?.data?.results || sectionsRes?.data?.result || sectionsRes?.data;
    return {
      allCats: (catRes.data?.results || catRes.data?.result || []) as any[],
      products: prodRes ? listFrom(prodRes.data).map(toCardProduct) : [],
      offerSections: Array.isArray(sections) ? sections : [],
    };
  }, [geo]);
  const store = useAsync(fetchStore);
  const error = store.error ? errorMessage(store.error, 'Could not load the store') : '';
  const allCats = useMemo(() => store.data?.allCats ?? [], [store.data]);
  const products = useMemo<Product[] | null>(() => store.data?.products ?? (store.error ? [] : null), [store.data, store.error]);
  const offerSections = store.data?.offerSections ?? [];

  // Hero banners + picked categories for the active tab
  const fetchHero = useCallback(async () => {
    const params = activeTab._id !== 'all' ? { pageType: 'header', headerId: activeTab._id } : { pageType: 'home' };
    try {
      const result = (await customerApi.getHeroConfig(params)).data?.result;
      return { banners: (result?.banners?.items || []) as any[], categoryIds: (result?.categoryIds || []) as any[] };
    } catch {
      return { banners: [] as any[], categoryIds: [] as any[] };
    }
  }, [activeTab]);
  const heroState = useAsync(fetchHero);
  const hero = {
    banners: heroState.loading ? null : (heroState.data?.banners ?? []),
    categoryIds: heroState.data?.categoryIds ?? [],
  };

  // Products for a selected header tab
  const fetchTabProducts = useCallback(async (): Promise<Product[] | null> => {
    if (activeTab._id === 'all' || !geo) return null;
    try {
      const r = await customerApi.getProducts({ headerId: activeTab._id, limit: 100, ...geo });
      return listFrom(r.data).map(toCardProduct);
    } catch {
      return [];
    }
  }, [activeTab, geo]);
  const tabState = useAsync(fetchTabProducts);
  const tabProducts = tabState.loading ? null : (tabState.data ?? null);

  const headers = useMemo(
    () => [ALL, ...allCats.filter((c) => c.type === 'header' && String(c.name).toLowerCase() !== 'all')],
    [allCats],
  );
  const categories = useMemo(() => allCats.filter((c) => c.type === 'category'), [allCats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await store.reload();
    setRefreshing(false);
  };

  const selectTab = (tab: any) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const headerCategories = useMemo(
    () =>
      isHeaderTab
        ? categories.filter((c) => String(c.parentId?._id || c.parentId || '') === String(activeTab._id))
        : [],
    [categories, isHeaderTab, activeTab],
  );

  const quickCategories = useMemo(() => {
    const byId = new Map(categories.map((c) => [String(c._id), c]));
    const picked = (hero.categoryIds || [])
      .map((id: any) => byId.get(String(id?._id || id)))
      .filter(Boolean)
      .filter((c: any) => !isHeaderTab || String(c.parentId?._id || c.parentId || '') === String(activeTab._id));
    const list = picked.length ? picked : isHeaderTab ? headerCategories : categories;
    return list.map((c: any) => ({ id: c._id, name: c.name, image: c.image }));
  }, [hero.categoryIds, categories, headerCategories, isHeaderTab, activeTab]);

  const deals = useMemo(() => [...onlyInStock(products || [])].sort((a, b) => savingPct(b) - savingPct(a)), [products]);

  const topCategories = useMemo(() => {
    const list = (isHeaderTab ? headerCategories : categories).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return isHeaderTab ? list : list.slice(0, 8);
  }, [categories, headerCategories, isHeaderTab]);

  const eta = settings.estimatedDeliveryTime?.trim() || '15–20 mins';
  const noService = hasLocation && products !== null && products.length === 0 && !error;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ backgroundColor: color.surface }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.primary]} progressViewOffset={insets.top} />}>
        {/* Green header: brand, location, actions, search */}
        <HeaderGradient style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <View style={styles.flex}>
              <View style={styles.brand} accessibilityLabel="A to Z Grocery">
                <Image source={require('@/assets/images/atoz-logo.webp')} style={styles.logo} contentFit="cover" />
                <Text style={styles.brandName} numberOfLines={1}>
                  A<Text style={styles.brandTo}> to </Text>Z<Text style={styles.brandGrocery}> Grocery</Text>
                </Text>
              </View>
              <Pressable accessibilityRole="button" style={styles.location} onPress={() => setLocationOpen(true)}>
                <Icon name="pin" size={18} color={color.headerAccent} />
                <View style={styles.flex}>
                  <Text style={styles.eta}>{eta}</Text>
                  <Text style={styles.address} numberOfLines={1}>
                    {isFetching ? 'Detecting location...' : currentLocation?.name || 'Select location'}
                  </Text>
                </View>
                <Icon name="arrow" size={14} color={color.onHeader} />
              </Pressable>
            </View>
            <View style={styles.actions}>
              <Pressable accessibilityLabel="Notifications" style={styles.iconBtn} onPress={() => router.push('/notifications')}>
                <Icon name="bell" color={color.onHeader} />
              </Pressable>
              <Pressable accessibilityLabel={`Cart, ${cartCount} items`} style={styles.iconBtn} onPress={() => router.push('/checkout')}>
                <Icon name="bag" color={color.onHeader} />
                {cartCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>
          <Pressable accessibilityRole="search" style={styles.search} onPress={() => router.navigate('/search')}>
            <Icon name="search" color="#71806c" />
            <Text style={styles.searchText}>Search for “chips”</Text>
            <Icon name="mic" size={18} color="#71806c" />
          </Pressable>
        </HeaderGradient>

        {/* Department tabs (admin "headers") */}
        {headers.length > 1 ? (
          <HeaderGradient style={styles.tabsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {headers.map((h) => {
                const selected = h._id === activeTab._id;
                return (
                  <Pressable
                    key={h._id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => selectTab(h)}
                    style={[styles.tab, selected && styles.tabSelected]}>
                    {h.image ? (
                      <Image source={cloudinary(h.image, 'f_auto,q_auto,w_100')} style={styles.tabIcon} contentFit="contain" />
                    ) : (
                      <Icon name={h._id === 'all' ? 'home' : 'spark'} size={21} color={selected ? '#ecffd1' : '#e0efdf'} />
                    )}
                    <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{h.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </HeaderGradient>
        ) : null}

        <BannerCarousel banners={hero.banners} />
        <BenefitsStrip />

        {error ? (
          <EmptyState icon="info" title="Couldn't load the store" message={error} />
        ) : !hasLocation && hydrated ? (
          <EmptyState icon="pin" title="Set your delivery location" message="We'll show shops and prices near you." />
        ) : noService ? (
          <EmptyState icon="truck" title="We're not here yet" message="No shops deliver to this location right now. Try another address." />
        ) : null}

        <QuickCategories categories={quickCategories} />

        {!isHeaderTab ? (
          <>
            <Shelf
              style={styles.lowest}
              title={
                <>
                  Lowest price <Text style={{ color: color.primary }}>ever</Text>
                </>
              }
              subtitle="Unbeatable savings. Updated hourly."
              products={deals}
              onSeeAll={() => openCategory('all')}
            />
            <Collections sections={offerSections} />
            <CategoryRails categories={categories} geo={geo} />
          </>
        ) : (
          <HeaderTabRows categories={headerCategories} products={tabProducts} tabName={activeTab.name} />
        )}

        <TopCategories categories={topCategories} />
        <HomeFooter />
      </ScrollView>

      <LocationSheet
        visible={locationOpen || (hydrated && !hasLocation)}
        dismissable={hasLocation}
        onClose={() => setLocationOpen(false)}
      />
    </View>
  );
}

/** A header tab: one shelf per level-2 category with products. */
function HeaderTabRows({ categories, products, tabName }: { categories: any[]; products: Product[] | null; tabName: string }) {
  if (products === null) return null;
  const inStock = onlyInStock(products);
  if (!inStock.length) {
    return <EmptyState title={`No products in ${tabName} yet`} message="Check back soon or explore other categories." />;
  }
  const rows = categories
    .map((c) => ({
      cat: c,
      items: inStock.filter((p) => String(p.categoryId?._id || p.categoryId || '') === String(c._id)),
    }))
    .filter((r) => r.items.length > 0);
  if (!rows.length) return <Shelf title={tabName} products={inStock} />;
  return (
    <>
      {rows.map(({ cat, items }) => (
        <Shelf key={cat._id} title={cat.name} subtitle={`${items.length} items`} products={items} onSeeAll={() => openCategory(cat._id)} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 22, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 15 },
  logo: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fbfaf6', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  brandName: { fontFamily: font.display, fontSize: 23, letterSpacing: -0.8, color: '#fffef3' },
  brandTo: { fontFamily: font.bodySemi, fontSize: 13, color: '#dff0cc' },
  brandGrocery: { fontFamily: font.bodySemi, fontSize: 17, color: '#e6f3d9' },
  location: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 48 },
  eta: { fontFamily: font.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.8, color: color.onHeader },
  address: { fontFamily: font.body, fontSize: 11, color: color.onHeaderMuted, marginTop: 3 },
  actions: { flexDirection: 'row', gap: space.sm, alignSelf: 'flex-start' },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.21)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: color.badge,
    borderWidth: 2,
    borderColor: '#1a7a45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: font.bodyBold, fontSize: 10, color: '#ffffff' },
  search: {
    marginTop: 21,
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
  searchText: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.onSurfaceVariant },
  tabsWrap: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  tabs: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14, gap: 16 },
  tab: {
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minWidth: 48,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSelected: { borderBottomColor: '#d4edb3' },
  tabIcon: { width: 21, height: 21 },
  tabText: { fontFamily: font.body, fontSize: 10, color: '#e0efdf' },
  tabTextSelected: { fontFamily: font.bodyBold, color: '#ecffd1' },
  lowest: { backgroundColor: '#dcebcf', borderTopWidth: 1, borderTopColor: '#c5d9b6', paddingBottom: 24, paddingTop: 24 },
});
