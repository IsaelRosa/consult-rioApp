import { useEffect, useState } from 'react';
import { Check, AlertCircle, Loader2, CreditCard, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../hooks/useApi';

type Plano = {
  slug: string;
  nome: string;
  max_dentistas: number;
  max_usuarios: number;
  preco_mensal: number;
  recursos: string[];
};

type RespostaAssinatura = {
  clinica: { nome: string; plano: string } | null;
  assinatura: { id: number; plano: string; status: string; valor_mensal: number } | null;
  plano: Plano;
  provedor: boolean;
};

const money = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

export default function Planos() {
  const { user } = useAuth();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [situacao, setSituacao] = useState<RespostaAssinatura | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [contratando, setContratando] = useState<string | null>(null);

  const carregar = () => {
    fetch('/api/plataforma/planos')
      .then((r) => (r.ok ? r.json() : []))
      .then(setPlanos)
      .catch(() => setPlanos([]));
    apiFetch<RespostaAssinatura>('/api/assinatura')
      .then(setSituacao)
      .catch(() => setSituacao(null));
  };

  useEffect(carregar, []);

  const contratar = async (plano: string) => {
    setErro('');
    setAviso('');
    setContratando(plano);
    try {
      const resposta = await apiFetch<{ checkout?: { url: string | null; observacao?: string } }>(
        '/api/assinatura/assinar',
        { method: 'POST', body: JSON.stringify({ plano }) },
      );

      // Com o gateway integrado, o checkout redireciona para o pagamento.
      if (resposta.checkout?.url) {
        window.location.href = resposta.checkout.url;
        return;
      }
      setAviso(resposta.checkout?.observacao || 'Plano atualizado.');
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível mudar o plano.');
    } finally {
      setContratando(null);
    }
  };

  const planoAtual = situacao?.clinica?.plano;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plano e assinatura</h1>
        <p className="text-sm text-slate-500">
          {situacao?.clinica ? `Clínica ${situacao.clinica.nome}` : 'Gerencie o plano da sua clínica'}
        </p>
      </div>

      {situacao && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-white p-5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-slate-500">Plano atual</p>
            <p className="font-semibold text-slate-900">{situacao.plano.nome}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Valor</p>
            <p className="font-semibold text-slate-900">{money(situacao.plano.preco_mensal)}/mês</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Situação</p>
            <p className="font-semibold text-slate-900">
              {situacao.assinatura?.status === 'ativa' ? 'Ativa' : 'Sem assinatura ativa'}
            </p>
          </div>
          {!situacao.provedor && (
            <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Pagamento ainda não liberado
            </span>
          )}
        </div>
      )}

      {erro && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {erro}
        </div>
      )}
      {aviso && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {aviso}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {planos.map((p) => {
          const atual = p.slug === planoAtual;
          return (
            <div
              key={p.slug}
              className={`flex flex-col rounded-xl border p-6 shadow-sm ${
                atual ? 'border-sky-500 bg-white ring-1 ring-sky-500' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-slate-900">{p.nome}</h2>
                {atual && (
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                    Atual
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-slate-500">
                até {p.max_dentistas} dentista{p.max_dentistas > 1 ? 's' : ''} · {p.max_usuarios} usuários
              </p>

              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">{money(p.preco_mensal)}</span>
                <span className="text-sm text-slate-500">/mês</span>
              </p>

              <ul className="mt-5 flex-1 space-y-2">
                {p.recursos.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {r}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => contratar(p.slug)}
                disabled={atual || contratando !== null}
                className={`mt-6 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                  atual ? 'bg-slate-100 text-slate-400' : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                {contratando === p.slug && <Loader2 className="h-4 w-4 animate-spin" />}
                {atual ? 'Plano atual' : 'Escolher este plano'}
                {!atual && contratando !== p.slug && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>

      {user?.perfil?.slug !== 'admin' && (
        <p className="text-xs text-slate-400">
          Apenas o administrador da clínica pode mudar o plano.
        </p>
      )}
    </div>
  );
}