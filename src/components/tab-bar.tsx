import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { color, font } from '@/theme/tokens';
import { Icon, type IconName } from './icon';

const ICONS: Record<string, IconName> = {
  index: 'home',
  categories: 'grid',
  search: 'search',
  orders: 'bag',
  profile: 'user',
};

export const TAB_BAR_HEIGHT = 74;

/** Website bottom nav (`.atz.bottom-nav`): label under icon, green underline when active. */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  return (
    <View>
      {current !== 'search' ? <CartBar aboveParent /> : null}
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={[styles.item, focused && styles.itemActive]}>
              <Icon name={ICONS[route.name] ?? 'home'} size={21} color={focused ? '#105c35' : '#5d6e5a'} />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: '#e9ece2',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 56,
    minHeight: 48,
    padding: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  itemActive: { borderBottomColor: color.primary },
  label: { fontFamily: font.body, fontSize: 11, color: '#5d6e5a' },
  labelActive: { fontFamily: font.bodyBold, color: '#105c35' },
});
