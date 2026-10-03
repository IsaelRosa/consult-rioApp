import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import supabase from '../lib/supabase';
import type { Usuario, PerfilSlug } from '../types';
import { handleGoogleRedirect } from '../lib/googleAuth';

const DEMO_SESSION_KEY = 'odonto-demo-session';

const demoUsers: Record<string, { password: string; user: Usuario }> = {
  'admin@odonto.com': {
    password: '123456',
    user: {
      id: 'demo-admin',
      email: 'admin@odonto.com',
      nome: 'Administrador',
      perfil_id: 1,
      perfil: { id: 1, nome: 'Administrador', slug: 'admin' },
      ativo: true,
    },
  },
  'recep@odonto.com': {
    password: '123456',
    user: {
      id: 'demo-recepcionista',
      email: 'recep@odonto.com',
      nome: 'Recepcionista',
      perfil_id: 2,
      perfil: { id: 2, nome: 'Recepcionista', slug: 'recepcionista' },
      ativo: true,
    },
  },
  'dentista@odonto.com': {
    password: '123456',
    user: {
      id: 'demo-dentista',
      email: 'dentista@odonto.com',
      nome: 'Dentista',
      perfil_id: 3,
      perfil: { id: 3, nome: 'Dentista', slug: 'dentista' },
      ativo: true,
    },
  },
  'financeiro@odonto.com': {
    password: '123456',
    user: {
      id: 'demo-financeiro',
      email: 'financeiro@odonto.com',
      nome: 'Financeiro',
      perfil_id: 4,
      perfil: { id: 4, nome: 'Financeiro', slug: 'financeiro' },
      ativo: true,
    },
  },
};

const isDemoMode = () => {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return !url || !key || url.includes('example') || key.includes('replace-with-your-anon-key');
};

const getDemoUserFromStorage = (): Usuario | null => {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.localStorage.getItem(DEMO_SESSION_KEY);
    if (!value) return null;
    return JSON.parse(value) as Usuario;
  } catch {
    return null;
  }
};

interface AuthContextValue {
  user: Usuario | null;
  session: unknown;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signUp: (email: string, password: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<unknown>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (authId: string) => {
    if (isDemoMode()) {
      const stored = getDemoUserFromStorage();
      setUser(stored || demoUsers[authId]?.user || null);
      return;
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`/api/usuarios/me?auth_id=${authId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Não foi possível carregar perfil');
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      setUser(null);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      void handleGoogleRedirect();
    }

    if (isDemoMode()) {
      const stored = getDemoUserFromStorage();
      setSession({ provider: 'demo' });
      setUser(stored || null);
      setLoading(false);
      return;
    }

    let active = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!active) return;

        setSession(currentSession as unknown);
        if (currentSession?.user?.id) await fetchUser(currentSession.user.id);
        else setLoading(false);
      } catch {
        if (active) {
          setLoading(false);
        }
      }

      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, nextSession: any) => {
          if (!active) return;
          setSession(nextSession as unknown);
          if (nextSession?.user?.id) await fetchUser(nextSession.user.id);
          else {
            setUser(null);
            setLoading(false);
          }
        });

        return subscription;
      } catch {
        return null;
      }
    };

    let subscription: { unsubscribe: () => void } | null = null;
    void initializeAuth().then((nextSubscription) => {
      subscription = nextSubscription;
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isDemoMode()) {
      const demoUser = demoUsers[normalizedEmail];
      if (demoUser && demoUser.password === password) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser.user));
        }
        setUser(demoUser.user);
        setSession({ provider: 'demo' });
        return {};
      }

      return { error: new Error('E-mail ou senha inválidos.') };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) return { error };
    if (data.user?.id) await fetchUser(data.user.id);
    return {};
  };

  const signUp = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isDemoMode()) {
      return { error: new Error('Criação de conta não está disponível em modo demo.') };
    }

    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    if (error) return { error };
    if (data.user?.id) await fetchUser(data.user.id);
    return {};
  };

  const signOut = async () => {
    if (isDemoMode()) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DEMO_SESSION_KEY);
      }
      setUser(null);
      setSession(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    if (isDemoMode()) {
      const stored = getDemoUserFromStorage();
      setUser(stored || null);
      return;
    }

    const currentSession = (await supabase.auth.getSession()).data.session;
    if (currentSession?.user?.id) await fetchUser(currentSession.user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function usePerfil(): PerfilSlug | null {
  const { user } = useAuth();
  return (user?.perfil?.slug as PerfilSlug) || null;
}
