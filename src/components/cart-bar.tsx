import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { useCart } from '@/context/cart';
import { rupees } from '@/lib/product';
import { color, font, shape } from '@/theme/tokens';
import { Icon } from './icon';

/** Floating "View cart" bar shown above the tab bar (website `.cart-summary`). */
export function CartBar({ bottom = 12, aboveParent }: { bottom?: number; aboveParent?: boolean }) {
  const { cartCount, cartTotal } = useCart();
  if (cartCount === 0) return null;
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(180)} style={[styles.wrap, aboveParent ? styles.above : { bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View cart, ${cartCount} items, ${rupees(cartTotal)}`}
        onPress={() => router.push('/checkout')}
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}>
        <Text style={styles.text}>
          {cartCount} item{cartCount > 1 ? 's' : ''} · {rupees(cartTotal)}
        </Text>
        <View style={styles.row}>
          <Text style={styles.strong}>View cart</Text>
          <Icon name="arrow" size={14} color="#ffffff" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  above: { bottom: '100%', marginBottom: 12 },
  bar: {
    backgroundColor: color.primary,
    borderRadius: shape.medium,
    paddingHorizontal: 15,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#234b33',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  text: { fontFamily: font.bodyMedium, fontSize: 13, color: '#ffffff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strong: { fontFamily: font.bodyBold, fontSize: 13, color: '#ffffff' },
});
