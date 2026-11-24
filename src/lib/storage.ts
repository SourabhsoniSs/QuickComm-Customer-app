import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const KEYS = {
  token: 'auth_customer_token',
  user: 'auth_customer_user',
  cart: 'guest_cart',
  wishlist: 'guest_wishlist',
  location: 'customer_location',
  recipient: 'checkout_recipient',
} as const;

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / unavailable: non-fatal
  }
}

export async function removeKey(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

// The auth token lives in the device keychain/keystore, not AsyncStorage.
export const tokenStore = {
  get: () => SecureStore.getItemAsync(KEYS.token),
  set: (token: string) => SecureStore.setItemAsync(KEYS.token, token),
  clear: () => SecureStore.deleteItemAsync(KEYS.token),
};
