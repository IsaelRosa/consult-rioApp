import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smile, Loader2, CheckCircle, Building2, UserPlus, ArrowLeft } from 'lucide-react';

type Plano = {
  slug: string;
  nome: string;
  max_dentistas: number;
  max_usuarios: number;
  preco_mensal: number;
  recursos: string[];
};

const money = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function Cadastro() {
  const navigate = useNavigate();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [plano, setPlano] = useState('essencial');
  const [form, setForm] = useState({
    clinica: '',
    cnpj: '',
    telefone: '',
    nome: '',
    email: '',
    senha: '',
    confirmar: '',
  });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<{ nome: string; email: string } | null>(null);

  useEffect(() => {
    fetch('/api/plataforma/planos')
      .then((r) => (r.ok ? r.json() : []))
      .then(setPlanos)
      .catch(() => setPlanos([]));
  }, []);

  const definir = (chave: string, valor: string) => setForm((f) => ({ ...f, [chave]: valor }));

  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (form.clinica.trim().length < 3) return setErro('Informe o nome da clínica.');
    if (form.nome.trim().length < 3) return setErro('Informe seu nome completo.');
    if (form.senha.length < 6) return setErro('A senha deve ter ao menos 6 caracteres.');
    if (form.senha !== form.confirmar) return setErro('As senhas não conferem.');

    setEnviando(true);
    try {
      const res = await fetch('/api/plataforma/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica: { nome: form.clinica, cnpj: form.cnpj, telefone: form.telefone },
          admin: { nome: form.nome, email: form.email, senha: form.senha },
          plano,
        }),
      });

      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados?.error || 'Não foi possível concluir o cadastro.');

      setConcluido({ nome: dados.clinica?.nome ?? form.clinica, email: form.email });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (concluido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="text-xl font-bold text-slate-900">Conta criada</h1>
          <p className="mt-2 text-sm text-slate-600">
            A clínica <strong>{concluido.nome}</strong> está pronta. Faça login para começar a cadastrar
            pacientes.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Smile className="h-8 w-8 text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Criar conta da clínica</h1>
              <p className="text-sm text-slate-500">Gestão odontológica completa, sem cartão de crédito.</p>
            </div>
          </div>

          {erro && <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

          <form onSubmit={enviarFormulario} className="space-y-6">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <Building2 className="h-4 w-4" /> Dados da clínica
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Nome da clínica *</span>
                  <input
                    value={form.clinica}
                    onChange={(e) => definir('clinica', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="Consultório Dental Boa Vista"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">CNPJ</span>
                  <input
                    value={form.cnpj}
                    onChange={(e) => definir('cnpj', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="00.000.000/0000-00"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Telefone</span>
                  <input
                    value={form.telefone}
                    onChange={(e) => definir('telefone', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="(35) 3000-0000"
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <UserPlus className="h-4 w-4" /> Responsável pelo acesso
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Seu nome *</span>
                  <input
                    value={form.nome}
                    onChange={(e) => definir('nome', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">E-mail *</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => definir('email', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Senha *</span>
                  <input
                    type="password"
                    value={form.senha}
                    onChange={(e) => definir('senha', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    minLength={6}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Confirmar senha *</span>
                  <input
                    type="password"
                    value={form.confirmar}
                    onChange={(e) => definir('confirmar', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    minLength={6}
                    required
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Plano</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {(planos.length ? planos : [{ slug: 'essencial', nome: 'Essencial', max_dentistas: 1, max_usuarios: 3, preco_mensal: 149, recursos: [] }]).map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setPlano(p.slug)}
                    className={`rounded-xl border p-4 text-left transition ${
                      plano === p.slug ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{p.nome}</p>
                    <p className="mt-1 text-lg font-bold text-sky-600">{money(p.preco_mensal)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      até {p.max_dentistas} dentista{p.max_dentistas > 1 ? 's' : ''} · {p.max_usuarios} usuários
                    </p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">Você pode mudar de plano depois. Nenhuma cobrança é feita agora.</p>
            </section>

            <button
              type="submit"
              disabled={enviando}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar conta grátis
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}