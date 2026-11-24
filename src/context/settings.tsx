import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { customerApi } from '@/lib/api';

export type Settings = {
  appName: string;
  estimatedDeliveryTime: string;
  codEnabled: boolean;
  onlineEnabled: boolean;
  [key: string]: any;
};

const DEFAULTS: Settings = {
  appName: 'A to Z Grocery',
  estimatedDeliveryTime: '12-15 mins',
  codEnabled: true,
  onlineEnabled: true,
};

const SettingsContext = createContext<Settings>(DEFAULTS);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    customerApi
      .getSettings()
      .then((res) => setSettings({ ...DEFAULTS, ...(res.data?.result || res.data || {}) }))
      .catch(() => {});
  }, []);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
