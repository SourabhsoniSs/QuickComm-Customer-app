import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, shape, space, type } from '@/theme/tokens';

type Tone = 'info' | 'success' | 'error';
type Snack = { id: number; message: string; tone: Tone };

const SnackbarContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** MD3 snackbar: inverse surface, bottom of screen, auto-dismiss. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<Snack | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: Tone = 'info') => {
    setSnack({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!snack) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSnack(null), 2800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [snack]);

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      {snack ? (
        <Animated.View
          key={snack.id}
          entering={FadeInDown.duration(250)}
          exiting={FadeOutDown.duration(200)}
          pointerEvents="none"
          style={[styles.snack, { bottom: insets.bottom + 96 }, snack.tone === 'error' && styles.error]}
          accessibilityLiveRegion="polite">
          <Text style={styles.text}>{snack.message}</Text>
        </Animated.View>
      ) : null}
    </SnackbarContext.Provider>
  );
}

export const useSnackbar = () => useContext(SnackbarContext);

const styles = StyleSheet.create({
  snack: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    backgroundColor: color.inverseSurface,
    borderRadius: shape.extraSmall,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    elevation: 6,
  },
  error: { backgroundColor: '#7a1d1d' },
  text: { ...type.bodyMedium, color: '#ffffff' },
});
