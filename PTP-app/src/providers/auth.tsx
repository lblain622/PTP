import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Account, Session, authRequest, readSession, saveSession } from '@/lib/auth-api';

type Auth = {
  user: Account | null; loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, hometown: string) => Promise<void>;
  acceptSocialSession: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string, hometown: string) => Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  async function persist(next: Session | null) {
    await saveSession(next);
    setSession(next);
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await readSession();
        if (saved) {
          const tokens = await authRequest<{ access: string }>('refresh', { refresh: saved.refresh });
          const user = await authRequest<Account>('me', undefined, tokens.access);
          if (active) await persist({ ...saved, ...tokens, user });
        }
      } catch { /* An expired or unavailable session returns to sign-in. */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  return <AuthContext.Provider value={{
    user: session?.user ?? null, loading,
    signIn: async (email, password) => persist(await authRequest<Session>('sign-in', { email, password })),
    register: async (name, email, password, hometown) => persist(await authRequest<Session>('register', { name, email, password, hometown })),
    acceptSocialSession: persist,
    signOut: async () => {
      if (session) await authRequest('sign-out', { refresh: session.refresh });
      await persist(null);
    },
    updateProfile: async (name, hometown) => {
      if (!session) return;
      const tokens = await authRequest<{ access: string }>('refresh', { refresh: session.refresh });
      const user = await authRequest<Account>('me', { name, hometown }, tokens.access, 'PATCH');
      await persist({ ...session, ...tokens, user });
    },
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider is missing.');
  return auth;
}
