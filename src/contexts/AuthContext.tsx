import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Usuario, PerfilSlug } from '../types';

// Sessão local contra a API (MySQL). Substitui o Supabase Auth:
// guarda o token em localStorage e o envia como Bearer a cada requisição.

const SESSION_KEY = 'odonto-session';

// Evento disparado pelas chamadas de API quando o servidor responde 401.
// O AuthContext escuta e encerra a sessão, levando o usuário ao login em vez
// de deixá-lo numa tela cheia de erros.
export const EVENTO_NAO_AUTORIZADO = 'odonto:nao-autorizado';

export const lerToken = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const bruto = window.localStorage.getItem(SESSION_KEY);
    if (!bruto) return '';
    const dados = JSON.parse(bruto) as { token?: string };
    return dados?.token || '';
  } catch {
    return '';
  }
};

const gravarSessao = (token: string, user: Usuario) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
};

const apagarSessao = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
};

const lerUsuarioArmazenado = (): Usuario | null => {
  if (typeof window === 'undefined') return null;
  try {
    const bruto = window.localStorage.getItem(SESSION_KEY);
    if (!bruto) return null;
    return (JSON.parse(bruto) as { user?: Usuario }).user ?? null;
  } catch {
    return null;
  }
};

interface AuthContextValue {
  user: Usuario | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = lerToken();
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const res = await fetch('/api/usuarios/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Token expirado ou revogado: limpa a sessão local.
      if (res.status === 401) {
        apagarSessao();
        setUser(null);
        return null;
      }
      if (!res.ok) throw new Error('Não foi possível carregar o perfil');

      const data = (await res.json()) as Usuario;
      gravarSessao(token, data);
      setUser(data);
      return data;
    } catch (err) {
      console.error(err);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Qualquer 401 vindo da API encerra a sessão local.
    const encerrar = () => {
      apagarSessao();
      setUser(null);
    };
    window.addEventListener(EVENTO_NAO_AUTORIZADO, encerrar);
    return () => window.removeEventListener(EVENTO_NAO_AUTORIZADO, encerrar);
  }, []);

  useEffect(() => {
    let ativo = true;

    void (async () => {
      if (!lerToken()) {
        if (ativo) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      await fetchUser();
      if (ativo) setLoading(false);
    })();

    return () => {
      ativo = false;
    };
  }, [fetchUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { error: new Error(data?.error || 'E-mail ou senha inválidos.') };
      }

      gravarSessao(data.token, data.user);
      setUser(data.user);
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Falha de conexão.') };
    }
  };

  const signOut = async () => {
    apagarSessao();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser: async () => { await fetchUser(); } }}>
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