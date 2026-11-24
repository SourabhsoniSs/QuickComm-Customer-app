import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';

import { customerApi, listFrom } from '@/lib/api';
import { cloudinary, FALLBACK_CATEGORY_IMAGE, onlyInStock, toCardProduct, type Product } from '@/lib/product';
import { color, font, shape, space, type } from '@/theme/tokens';
import { Icon } from './icon';
import { ProductCard } from './product-card';
import { Shelf } from './shelf';

export const openCategory = (id: string) => router.push({ pathname: '/category/[id]', params: { id } });

// ---------- Banner carousel ----------

export function BannerCarousel({ banners }: { banners: any[] | null }) {
  const { width } = useWindowDimensions();
  const slideW = width - 40;
  const slideH = Math.round((slideW * 397) / 824);
  const ref = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const items = useMemo(() => (banners || []).filter((b) => b?.imageUrl), [banners]);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % items.length;
        ref.current?.scrollTo({ x: next * slideW, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(t);
  }, [items.length, slideW]);

  if (banners === null) return <View style={[styles.banner, { height: slideH, backgroundColor: color.surfaceContainerHighest }]} />;
  if (!items.length) return null;

  return (
    <View style={[styles.banner, { height: slideH }]}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / slideW))}>
        {items.map((b, i) => (
          <Pressable key={`${i}-${b.imageUrl}`} onPress={() => openBanner(b)} accessibilityRole="imagebutton" accessibilityLabel={b.title || 'Offer'}>
            <Image
              source={cloudinary(b.imageUrl, 'f_auto,q_auto,c_scale,w_824')}
              style={{ width: slideW, height: slideH }}
              contentFit="cover"
              transition={200}
            />
          </Pressable>
        ))}
      </ScrollView>
      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((b, i) => (
            <View key={`d-${i}`} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
      <Text style={styles.adLabel}>AD</Text>
    </View>
  );
}

// Same rules as the website's bannerTarget()
function openBanner(b: any) {
  const kind = b?.linkType;
  const value = String(b?.linkValue || '').trim();
  if (!value || !kind || kind === 'none') return;
  if (kind === 'product') router.push({ pathname: '/product/[id]', params: { id: value } });
  else if (kind === 'header' || kind === 'category' || kind === 'subcategory') openCategory(value);
  else if (kind === 'url' && /^https?:\/\//i.test(value)) WebBrowser.openBrowserAsync(value);
}

// ---------- Benefits strip ----------

export function BenefitsStrip() {
  return (
    <View style={styles.benefits}>
      <View style={styles.benefit}>
        <Icon name="truck" size={14} color="#3f6042" />
        <Text style={styles.benefitText}>Fast delivery</Text>
      </View>
      <View style={styles.benefitDot} />
      <Text style={styles.benefitText}>Minimum order ₹99</Text>
      <View style={styles.benefitDot} />
      <Text style={styles.benefitText}>Everyday savings</Text>
    </View>
  );
}

// ---------- Quick categories ----------

export function QuickCategories({ categories }: { categories: { id: string; name: string; image?: string }[] }) {
  if (!categories.length) return null;
  return (
    <View style={styles.quick}>
      <View style={styles.centered}>
        <Text style={styles.eyebrow}>A LITTLE OF EVERYTHING</Text>
        <Text style={styles.centeredTitle}>Quick categories</Text>
        <Text style={styles.centeredSub}>A little something for your everyday.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        {categories.map((c, i) => (
          <Pressable key={c.id} onPress={() => openCategory(c.id)} style={styles.quickItem} accessibilityRole="button">
            <View style={[styles.categoryImage, { backgroundColor: color.tileTints[i % 4] }]}>
              <Image source={cloudinary(c.image || FALLBACK_CATEGORY_IMAGE, 'f_auto,q_auto,w_150')} style={styles.categoryImg} contentFit="contain" />
            </View>
            <Text style={styles.tileLabel} numberOfLines={2}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------- "Trending right now" collections (admin offer sections) ----------

export function Collections({ sections }: { sections: any[] }) {
  const sorted = useMemo(() => [...(sections || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [sections]);
  return (
    <>
      {sorted.map((section, idx) => {
        const products = onlyInStock(
          (section.productIds || []).filter((p: any) => p && typeof p === 'object').map(toCardProduct),
        );
        if (!products.length) return null;
        const subtitle =
          (section.categoryIds || [])
            .map((c: any) => (typeof c === 'object' ? c?.name : null))
            .filter(Boolean)
            .join(', ') || section.categoryId?.name;
        const yellow = idx % 2 === 1;
        return (
          <View key={section._id} style={styles.collection}>
            <View style={[styles.collectionBanner, yellow ? styles.yellow : styles.blue]}>
              <View style={styles.flex}>
                <View style={styles.collectionEyebrowRow}>
                  <Icon name="spark" size={11} color={yellow ? '#725319' : '#c8dfef'} />
                  <Text style={[styles.collectionEyebrow, yellow && { color: '#725319' }]}>Trending right now</Text>
                </View>
                <Text style={[styles.collectionTitle, { color: yellow ? '#3e3017' : '#ffffff' }]}>{section.title}</Text>
                {subtitle ? <Text style={[styles.collectionSub, yellow && { color: '#6e531f' }]}>{subtitle}</Text> : null}
              </View>
              <Image source={cloudinary(products[0].image, 'f_auto,q_auto,w_120')} style={styles.collectionImg} contentFit="contain" />
            </View>
            <ProductRow products={products} />
          </View>
        );
      })}
    </>
  );
}

const Gap = () => <View style={{ width: 12 }} />;
const keyOf = (p: Product) => String(p.id || p._id);

function ProductRow({ products }: { products: Product[] }) {
  const renderItem = useCallback(({ item }: { item: Product }) => <ProductCard product={item} />, []);
  return (
    <FlashList
      horizontal
      data={products}
      renderItem={renderItem}
      keyExtractor={keyOf}
      ItemSeparatorComponent={Gap}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space.xl }}
    />
  );
}

// ---------- Category rails ----------

const RAIL_COPY = [
  { match: /fruit|vegetable/i, title: 'Your Daily Fresh Needs', subtitle: 'Fresh-picked fruits & vegetables' },
  { match: /snack|chip|namkeen|biscuit|sweet|chocolate|drink|beverage/i, title: 'Snack It Away', subtitle: 'Chips, namkeen, cold drinks & sweets' },
  { match: /dairy|bread|milk|egg/i, title: 'Morning Essentials', subtitle: 'Milk, bread & breakfast basics' },
  { match: /masala|spice/i, title: 'Spice Up Your Kitchen', subtitle: 'Whole & ground masalas' },
  { match: /aata|atta|dal|rice|flour|grain/i, title: 'Pantry Staples', subtitle: 'Aata, dal & rice for every day' },
];
const copyIndex = (name: string) => RAIL_COPY.findIndex((c) => c.match.test(name || ''));

/** Up to 4 category shelves with at least 3 in-stock products. */
export function CategoryRails({ categories, geo }: { categories: any[]; geo: { lat: number; lng: number } | null }) {
  const [rails, setRails] = useState<{ cat: any; products: Product[] }[]>([]);

  const candidates = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const ia = copyIndex(a.name);
        const ib = copyIndex(b.name);
        if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        return String(a.name).localeCompare(String(b.name));
      }),
    [categories],
  );

  useEffect(() => {
    if (!geo || !candidates.length) return;
    let cancelled = false;
    Promise.all(
      candidates.slice(0, 8).map((cat) =>
        customerApi
          .getProducts({ categoryId: cat._id, limit: 12, lat: geo.lat, lng: geo.lng })
          .then((r) => ({ cat, products: onlyInStock(listFrom(r.data).map(toCardProduct)) }))
          .catch(() => ({ cat, products: [] as Product[] })),
      ),
    ).then((all) => {
      if (!cancelled) setRails(all.filter((r) => r.products.length >= 3).slice(0, 4));
    });
    return () => {
      cancelled = true;
    };
  }, [candidates, geo]);

  const used = new Set<number>();
  return (
    <>
      {rails.map(({ cat, products }) => {
        const g = copyIndex(cat.name);
        const friendly = g !== -1 && !used.has(g);
        if (friendly) used.add(g);
        return (
          <Shelf
            key={cat._id}
            title={friendly ? RAIL_COPY[g].title : cat.name}
            subtitle={friendly ? RAIL_COPY[g].subtitle : `${products.length} items available now`}
            products={products}
            onSeeAll={() => openCategory(cat._id)}
          />
        );
      })}
    </>
  );
}

// ---------- Explore top categories ----------

export function TopCategories({ categories }: { categories: any[] }) {
  if (!categories.length) return null;
  return (
    <View style={styles.top}>
      <View style={styles.topHeading}>
        <Text style={styles.topTitle}>Explore top categories</Text>
        <Text style={styles.muted}>{categories.length} categories</Text>
      </View>
      <View style={styles.topGrid}>
        {categories.map((c) => (
          <Pressable key={c._id} onPress={() => openCategory(c._id)} style={styles.topItem} accessibilityRole="button">
            <View style={styles.topTile}>
              <Image source={cloudinary(c.image || FALLBACK_CATEGORY_IMAGE, 'f_auto,q_auto,w_130')} style={styles.topImg} contentFit="contain" />
            </View>
            <Text style={styles.topLabel} numberOfLines={2}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------- Footer ----------

export function HomeFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        India’s last{'\n'}minute app{'  '}
      </Text>
      <View style={styles.footerHeart}>
        <Icon name="heart" size={32} color="#d8a299" fill="#e7c1b8" />
      </View>
      <Text style={styles.footerSmall}>© A to Z Grocery</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  banner: { marginHorizontal: 20, marginTop: 20, borderRadius: 15, overflow: 'hidden', backgroundColor: '#211944' },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 16, backgroundColor: '#ffffff' },
  adLabel: {
    position: 'absolute',
    bottom: 9,
    right: 10,
    fontSize: 8,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.19)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  benefits: { marginHorizontal: 20, marginTop: 14, marginBottom: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  benefitText: { fontFamily: font.body, fontSize: 10, color: '#3f6042' },
  benefitDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#9aa791' },
  quick: { paddingBottom: 27 },
  centered: { alignItems: 'center', gap: 3, marginBottom: 20, paddingHorizontal: 20 },
  eyebrow: { fontFamily: font.bodyBold, fontSize: 9, letterSpacing: 1.6, color: '#466044' },
  centeredTitle: { ...type.headlineSmall, color: color.onSurface },
  centeredSub: { fontFamily: font.body, fontSize: 12, color: color.onSurfaceVariant },
  quickRow: { paddingHorizontal: 20, gap: 11 },
  quickItem: { width: 78 },
  categoryImage: { height: 83, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 9, overflow: 'hidden' },
  categoryImg: { width: '85%', height: '85%' },
  tileLabel: { fontFamily: font.bodyMedium, fontSize: 10, lineHeight: 14.5, color: color.onSurface, textAlign: 'center' },
  collection: { paddingVertical: 18 },
  collectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: shape.medium,
  },
  blue: { backgroundColor: '#2c4c68' },
  yellow: { backgroundColor: '#f0cb6a' },
  collectionEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  collectionEyebrow: { fontFamily: font.bodyMedium, fontSize: 9, color: '#c8dfef' },
  collectionTitle: { fontFamily: font.display, fontSize: 18, lineHeight: 22, letterSpacing: -0.6, marginTop: 3 },
  collectionSub: { fontFamily: font.body, fontSize: 10, color: '#d2e0eb', marginTop: 2 },
  collectionImg: { width: 46, height: 46, borderRadius: 10, backgroundColor: '#fff8e3', borderWidth: 2, borderColor: 'rgba(255,255,255,0.19)' },
  top: { borderTopWidth: 1, borderTopColor: color.divider, paddingTop: 26, paddingBottom: 30, paddingHorizontal: 20 },
  topHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  topTitle: { ...type.titleMedium, fontSize: 17, color: color.onSurface },
  muted: { fontFamily: font.body, fontSize: 11, color: color.onSurfaceVariant },
  topGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 20 },
  topItem: { width: '25%', paddingHorizontal: 6 },
  topTile: { height: 66, backgroundColor: color.surfaceContainer, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  topImg: { width: 56, height: 48 },
  topLabel: { fontFamily: font.body, fontSize: 10, lineHeight: 14, color: color.onSurface, textAlign: 'center' },
  // extra bottom room keeps the footer text clear of the floating cart bar
  footer: { backgroundColor: color.inverseSurface, paddingTop: 31, paddingHorizontal: 25, paddingBottom: 96 },
  footerText: { fontFamily: font.display, fontSize: 32, lineHeight: 37, letterSpacing: -1.2, color: color.inverseOnSurface },
  footerHeart: { position: 'absolute', top: 70, left: 190, transform: [{ rotate: '-15deg' }] },
  footerSmall: { fontFamily: font.body, fontSize: 10, color: '#b7cbae', marginTop: 24 },
});
