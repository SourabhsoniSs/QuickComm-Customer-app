import { FlashList } from '@shopify/flash-list';
import { useCallback, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Product } from '@/lib/product';
import { color, font, space, type } from '@/theme/tokens';
import { Icon } from './icon';
import { ProductCard } from './product-card';

const keyOf = (p: Product) => String(p.id || p._id);
const Gap = () => <View style={styles.gap} />;

/** Website `Shelf`: heading + "See all" + horizontally scrolling product row. */
export function Shelf({
  title,
  subtitle,
  products,
  onSeeAll,
  style,
}: {
  title: ReactNode;
  subtitle?: string;
  products: Product[];
  onSeeAll?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const renderItem = useCallback(({ item }: { item: Product }) => <ProductCard product={item} />, []);
  if (!products.length) return null;
  return (
    <View style={[styles.shelf, style]}>
      <SectionHeading title={title} subtitle={subtitle} onSeeAll={onSeeAll} />
      <FlashList
        horizontal
        data={products.slice(0, 12)}
        renderItem={renderItem}
        keyExtractor={keyOf}
        ItemSeparatorComponent={Gap}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      />
    </View>
  );
}

export function SectionHeading({
  title,
  subtitle,
  onSeeAll,
}: {
  title: ReactNode;
  subtitle?: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.heading}>
      <View style={styles.flex}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onSeeAll ? (
        <Pressable accessibilityRole="button" onPress={onSeeAll} style={styles.seeAll} hitSlop={6}>
          <Text style={styles.seeAllText}>See all</Text>
          <Icon name="arrow" size={13} color={color.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { paddingTop: 22, paddingBottom: 8 },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: space.xl,
    marginBottom: 14,
  },
  flex: { flex: 1 },
  title: { ...type.titleLarge, color: color.onSurface },
  subtitle: { fontFamily: font.body, fontSize: 12, color: color.onSurfaceVariant, marginTop: 5 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 44, minWidth: 48, justifyContent: 'center' },
  seeAllText: { fontFamily: font.bodyBold, fontSize: 12, color: color.primary },
  row: { paddingHorizontal: space.xl, paddingBottom: 3 },
  gap: { width: 12 },
});
