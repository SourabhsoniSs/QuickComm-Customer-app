import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { customerApi } from '@/lib/api';
import { getJSON, KEYS, setJSON } from '@/lib/storage';
import { useAuth } from './auth';

export type DeliveryLocation = {
  name: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
};

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  location: { lat: number; lng: number } | null;
  raw: any;
};

type LocationValue = {
  currentLocation: DeliveryLocation | null;
  hasLocation: boolean;
  hydrated: boolean;
  isFetching: boolean;
  savedAddresses: SavedAddress[];
  setLocation: (loc: DeliveryLocation) => void;
  detectLocation: () => Promise<{ ok: boolean; error?: string }>;
  refreshAddresses: () => Promise<void>;
};

const LocationContext = createContext<LocationValue | null>(null);
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Saved addresses from the profile; [] when logged out, null on failure. */
async function fetchAddresses(isAuthenticated: boolean): Promise<SavedAddress[] | null> {
  if (!isAuthenticated) return [];
  try {
    const res = await customerApi.getProfile();
    const profile = res.data?.result ?? res.data?.data ?? res.data;
    const raw: any[] = Array.isArray(profile?.addresses) ? profile.addresses : [];
    return raw.map((a, i) => ({
      id: a._id ?? String(i),
      label: (a.label || 'home').charAt(0).toUpperCase() + (a.label || 'home').slice(1),
      address: a.fullAddress || [a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', '),
      location:
        Number.isFinite(a?.location?.lat) && Number.isFinite(a?.location?.lng)
          ? { lat: a.location.lat, lng: a.location.lng }
          : null,
      raw: a,
    }));
  } catch {
    return null;
  }
}

const valid = (l: any): l is DeliveryLocation =>
  Boolean(l?.name) && Number.isFinite(l?.latitude) && Number.isFinite(l?.longitude);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [currentLocation, setCurrent] = useState<DeliveryLocation | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    getJSON<any>(KEYS.location, null).then((saved) => {
      if (saved && valid(saved.loc) && Date.now() - (saved.at || 0) < TTL_MS) setCurrent(saved.loc);
      setHydrated(true);
    });
  }, []);

  const setLocation = useCallback((loc: DeliveryLocation) => {
    setCurrent(loc);
    setJSON(KEYS.location, { loc, at: Date.now() });
  }, []);

  const detectLocation = useCallback(async () => {
    setIsFetching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { ok: false, error: 'Location permission denied' };
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      let loc: DeliveryLocation = {
        name: `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
        latitude,
        longitude,
      };
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (place) {
          const parts = [place.name, place.street, place.district, place.city]
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i);
          const statePin = [place.region, place.postalCode].filter(Boolean).join(' ');
          if (statePin) parts.push(statePin);
          loc = {
            name: parts.join(', ') || loc.name,
            city: place.city ?? undefined,
            state: place.region ?? undefined,
            pincode: place.postalCode ?? undefined,
            latitude,
            longitude,
          };
        }
      } catch {
        // coordinates are enough for delivery pricing
      }
      setLocation(loc);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Could not get your location' };
    } finally {
      setIsFetching(false);
    }
  }, [setLocation]);

  const refreshAddresses = useCallback(async () => {
    const list = await fetchAddresses(isAuthenticated);
    if (list) setSavedAddresses(list);
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    fetchAddresses(isAuthenticated).then((list) => {
      if (active && list) setSavedAddresses(list);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      currentLocation,
      hasLocation: valid(currentLocation),
      hydrated,
      isFetching,
      savedAddresses,
      setLocation,
      detectLocation,
      refreshAddresses,
    }),
    [currentLocation, hydrated, isFetching, savedAddresses, setLocation, detectLocation, refreshAddresses],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useDeliveryLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useDeliveryLocation must be used inside LocationProvider');
  return ctx;
}

/** `{ lat, lng }` query params for product APIs, or null without a location. */
export function useGeoParams() {
  const { currentLocation } = useDeliveryLocation();
  return useMemo(
    () => (currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null),
    [currentLocation],
  );
}
