import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/auth';
import { CartProvider } from '@/context/cart';
import { LocationProvider } from '@/context/location';
import { SettingsProvider } from '@/context/settings';
import { SnackbarProvider } from '@/context/snackbar';
import { WishlistProvider } from '@/context/wishlist';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: color.primary, background: color.surface, card: color.surface, text: color.onSurface },
};

function RootStack() {
  const { ready, isAuthenticated } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const loaded = ready && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.surface } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="checkout" />
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="order/[orderId]" />
        <Stack.Screen name="addresses" />
        <Stack.Screen name="wishlist" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="payment" options={{ presentation: 'modal', gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <SnackbarProvider>
            <SettingsProvider>
              <AuthProvider>
                <LocationProvider>
                  <WishlistProvider>
                    <CartProvider>
                      <StatusBar style="light" />
                      <RootStack />
                    </CartProvider>
                  </WishlistProvider>
                </LocationProvider>
              </AuthProvider>
            </SettingsProvider>
          </SnackbarProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
