import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail closed: privileged keys must never be used by a mobile client.
const publicKey = key?.startsWith('sb_publishable_') || (() => {
  try {
    return JSON.parse(atob(key?.split('.')[1] ?? '')).role === 'anon';
  } catch {
    return false;
  }
})();
export const backendConfigured = Boolean(url?.startsWith('https://') && publicKey);

export const supabase = backendConfigured
  ? createClient(url!, key!, {
      auth: {
        // Web sessions stay in memory; native sessions use OS-protected storage.
        ...(Platform.OS !== 'web' ? { storage: {
          getItem: (name: string) => SecureStore.getItemAsync(name),
          setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
          removeItem: (name: string) => SecureStore.deleteItemAsync(name),
        } } : {}),
        persistSession: Platform.OS !== 'web',
        autoRefreshToken: true,
        detectSessionInUrl: false,
        
      },
    })
  : null;
