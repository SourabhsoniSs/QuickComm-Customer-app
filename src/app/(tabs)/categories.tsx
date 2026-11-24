import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { openCategory } from '@/components/home-sections';
import { EmptyState, Loading, PageHeader } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { customerApi, errorMessage } from '@/lib/api';
import { cloudinary } from '@/lib/product';
import { color, font, space, type } from '@/theme/tokens';

// Same tints as the website's CategoriesPage
const COLORS = ['#F2EEE4', '#EFE7E2', '#EAF1F4', '#F0E8F2', '#EAF4EC', '#F5F1E6', '#EEF2F6', '#F2EEF5'];
const FALLBACK =
  'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/layout-engine/2022-11/Slice-1_9.png';

type Group = { title: string; categories: { id: string; name: string; image: string; color: string }[] };

async function fetchGroups(): Promise<Group[]> {
  const res = await customerApi.getCategories({ tree: true });
  const tree: any[] = res.data?.results || res.data?.result || [];
  return tree
    .filter((h) => String(h.name || '').trim().toLowerCase() !== 'all')
    .map((h, i) => ({
      title: h.name,
      categories: (h.children || []).map((c: any, j: number) => ({
        id: c._id,
        name: c.name,
        image: c.image || FALLBACK,
        color: COLORS[(i + j) % COLORS.length],
      })),
    }))
    .filter((g) => g.categories.length > 0);
}

export default function CategoriesScreen() {
  const { data, error: loadError, reload } = useAsync(fetchGroups);
  const [refreshing, setRefreshing] = useState(false);
  const error = loadError ? errorMessage(loadError) : '';
  const groups = data ?? (error ? [] : null);

  return (
    <View style={styles.screen}>
      <PageHeader title="Categories" subtitle="Everything you need, delivered fast" back={false} />
      {groups === null ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              colors={[color.primary]}
              onRefresh={async () => {
                setRefreshing(true);
                await reload();
                setRefreshing(false);
              }}
            />
          }>
          {error ? <EmptyState icon="info" title="Couldn't load categories" message={error} /> : null}
          {groups.map((g) => (
            <View key={g.title} style={styles.group}>
              <Text style={styles.groupTitle}>{g.title}</Text>
              <View style={styles.grid}>
                {g.categories.map((c) => (
                  <Pressable key={c.id} accessibilityRole="button" onPress={() => openCategory(c.id)} style={styles.item}>
                    <View style={[styles.tile, { backgroundColor: c.color }]}>
                      <Image source={cloudinary(c.image, 'f_auto,q_auto,w_150')} style={styles.img} contentFit="contain" />
                    </View>
                    <Text style={styles.label} numberOfLines={2}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  content: { paddingHorizontal: space.lg, paddingBottom: 140 },
  group: { marginTop: space.xl },
  groupTitle: { ...type.titleMedium, color: color.onSurface, marginBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  item: { width: '25%', paddingHorizontal: 5 },
  tile: { aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden' },
  img: { width: '80%', height: '80%' },
  label: { fontFamily: font.bodyMedium, fontSize: 11, lineHeight: 14, color: color.onSurface, textAlign: 'center' },
});
