import { create } from 'axios';
import Constants from 'expo-constants';

/**
 * Backend base URL.
 * 1. EXPO_PUBLIC_API_URL from .env (use your deployed backend or LAN IP).
 * 2. Otherwise the dev machine's LAN IP (from the Expo dev server) on port 5000,
 *    which is where the website's .env points the backend.
 */
function resolveBaseUrl() {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) {
    const trimmed = env.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:5000/api`;
}

export const API_BASE_URL = resolveBaseUrl();

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export const api = create({ baseURL: API_BASE_URL, timeout: 30000 });

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

// A 401 from this backend means the token is dead: end the session.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && error.config?.headers?.Authorization) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: any, fallback = 'Something went wrong') {
  if (error?.response?.data?.message) return String(error.response.data.message);
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return `Can't reach the server (${API_BASE_URL}). Check your connection.`;
  }
  return fallback;
}

/** Pulls a list out of the backend's several response shapes. */
export function listFrom(data: any): any[] {
  const r = data?.result;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(r?.items)) return r.items;
  if (Array.isArray(r)) return r;
  return [];
}

const cleanId = (id: unknown) => encodeURIComponent(String(id ?? '').trim());

export const customerApi = {
  sendLoginOtp: (data: { phone: string }) => api.post('/customer/send-login-otp', data),
  sendSignupOtp: (data: { name: string; phone: string }) => api.post('/customer/send-signup-otp', data),
  verifyOtp: (data: { phone: string; otp: string }) => api.post('/customer/verify-otp', data),
  getProfile: () => api.get('/customer/profile'),
  updateProfile: (data: any) => api.put('/customer/profile', data),
  getWalletTransactions: (params?: any) => api.get('/customer/transactions', { params }),

  getSettings: () => api.get('/settings'),
  getCategories: (params?: any) => api.get('/categories', { params }),
  getProducts: (params?: any) => api.get('/products', { params }),
  getProductById: (id: string, params?: any) => api.get(`/products/${cleanId(id)}`, { params }),
  getProductReviews: (id: string) => api.get(`/reviews/product/${cleanId(id)}`),
  getHeroConfig: (params?: any) => api.get('/experience/hero', { params }),
  getOfferSections: (params?: any) => api.get('/offer-sections', { params }),

  getCart: () => api.get('/cart'),
  addToCart: (data: any) => api.post('/cart/add', data),
  updateCartQuantity: (data: any) => api.put('/cart/update', data),
  removeFromCart: (productId: string, variantSku = '') =>
    api.delete(`/cart/remove/${cleanId(productId)}`, {
      params: variantSku ? { variantSku } : {},
    }),
  clearCart: () => api.delete('/cart/clear'),

  getWishlist: (params?: any) => api.get('/wishlist', { params }),
  addToWishlist: (data: any) => api.post('/wishlist/add', data),
  removeFromWishlist: (productId: string) => api.delete(`/wishlist/remove/${cleanId(productId)}`),

  checkoutPreview: (data: any) => api.post('/orders/checkout/preview', data, { timeout: 120000 }),
  createOrder: (data: any) => api.post('/orders', data, { timeout: 120000 }),
  getMyOrders: () => api.get('/orders/my-orders'),
  getOrderDetails: (orderId: string) => api.get(`/orders/details/${cleanId(orderId)}`),
  cancelOrder: (orderId: string, data: any) => api.put(`/orders/cancel/${cleanId(orderId)}`, data),

  createPaymentOrder: (data: any) => api.post('/payments/create-order', data),
  verifyPaymentStatus: (id: string) => api.get(`/payments/status/${cleanId(id)}`),

  getActiveCoupons: () => api.get('/coupons', { params: { status: 'active' } }),
  validateCoupon: (data: any) => api.post('/coupons/validate', data),
  geocodeAddress: (address: string) => api.get('/maps/geocode', { params: { address } }),

  getNotifications: (params?: any) => api.get('/notifications', { params }),
  markNotificationsRead: () => api.patch('/notifications/read'),
};
