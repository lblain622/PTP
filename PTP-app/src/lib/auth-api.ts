import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type Account = { id: number; email: string; name: string; hometown: string };
export type Session = { access: string; refresh: string; user: Account };
const base = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const key = 'ptp-session';

export async function readSession(): Promise<Session | null> {
  const value = Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null)
    : await SecureStore.getItemAsync(key);
  return value ? JSON.parse(value) : null;
}

export async function saveSession(session: Session | null) {
  if (Platform.OS === 'web') {
    if (session) window.sessionStorage.setItem(key, JSON.stringify(session));
    else window.sessionStorage.removeItem(key);
  } else if (session) await SecureStore.setItemAsync(key, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(key);
}

export async function authRequest<T>(path: string, body?: object, access?: string, method?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api/auth/${path}/`, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Unable to reach PTP. Check your connection and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(Object.values(data).flat().join(' ') || 'Something went wrong. Please try again.');
  }
  return data as T;
}
