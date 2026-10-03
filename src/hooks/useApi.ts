import { useState, useEffect, useCallback } from 'react';
import { lerToken } from '../contexts/AuthContext';

const rawBaseUrl = (import.meta.env.VITE_API_URL || '').trim();

// Em produção a API é servida pelo mesmo Express que entrega o front
// (rotas /api no mesmo domínio). Se VITE_API_URL apontar para localhost,
// isso só funciona na máquina do dev — nunca no navegador do visitante.
const isLocalhostBase = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(rawBaseUrl);

// Deixa a base sem o sufixo /api para não gerar /api/api/...
const apiBaseUrl = isLocalhostBase ? '' : rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');

const resolveApiUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith('/')) return url;
  if (!apiBaseUrl) return url;
  return `${apiBaseUrl}${url}`;
};

const getFallbackData = <T,>(url: string): T | undefined => {
  if (url.includes('/dashboard')) {
    return {
      consultasHoje: 0,
      consultasSemana: 0,
      pacientesAtivos: 0,
      faturamentoMes: 0,
      despesasMes: 0,
      saldoMes: 0,
      consultasPorStatus: [],
      faturamentoUltimosMeses: [],
      proximasConsultas: [],
    } as T;
  }

  if (url.includes('/consultas') || url.includes('/pacientes') || url.includes('/dentistas') || url.includes('/orcamentos') || url.includes('/pagamentos') || url.includes('/despesas') || url.includes('/usuarios') || url.includes('/perfis') || url.includes('/procedimentos') || url.includes('/tratamentos') || url.includes('/odontograma')) {
    return [] as T;
  }

  return undefined;
};

const parseJsonResponse = async (res: Response) => {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!text.trim()) return undefined;

  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    throw new Error('Resposta inválida do servidor: esperado JSON.');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Resposta inválida do servidor: JSON malformado.');
  }
};

export interface UseApiResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

export function useApi<T>(url: string | null, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false);
      setData(undefined);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = lerToken();
      const resolvedUrl = resolveApiUrl(url);
      const res = await fetch(resolvedUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const fallback = getFallbackData<T>(url);
        setData(fallback ?? undefined);
        if (!fallback) {
          setError(`API indisponível (${res.status}).`);
        }
        return;
      }

      const json = await parseJsonResponse(res);
      setData((json ?? getFallbackData<T>(url)) as T);
    } catch (err) {
      const fallback = getFallbackData<T>(url);
      setData(fallback ?? undefined);
      if (!fallback) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, deps);

  return { data, loading, error, refetch: fetchData, setData };
}

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit & { requireAuth?: boolean }
): Promise<T> {
  const token = lerToken();
  const resolvedUrl = resolveApiUrl(url);
  const res = await fetch(resolvedUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // Sessão expirada: limpa o token para o AuthContext cair no login.
  if (res.status === 401 && !url.includes('/usuarios/login')) {
    window.localStorage.removeItem('odonto-session');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    throw new Error('Resposta inválida do servidor: esperado JSON.');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Resposta inválida do servidor: JSON malformado.');
  }
}
