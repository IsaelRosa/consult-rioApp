import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Smile, CalendarCheck, Wallet, FileText, Check, ArrowRight, Star,
  ShieldCheck, Stethoscope, Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Plano = {
  slug: string;
  nome: string;
  max_dentistas: number;
  max_usuarios: number;
  preco_mensal: number;
  recursos: string[];
};

const money = (v: number) => `R$ ${v.toFixed(0)}`;

const RECURSOS = [
  {
    icone: CalendarCheck,
    titulo: 'Agenda organizada',
    texto: 'Consultas por profissional, status, observações e histórico. A recepção não precisa mais anotar nada em papel.',
  },
  {
    icone: FileText,
    titulo: 'Odontograma e prontuário',
    texto: 'Condição de cada dente, procedimentos realizados e o histórico clínico do paciente no mesmo lugar.',
  },
  {
    icone: Wallet,
    titulo: 'Financeiro integrado',
    texto: 'Orçamento, pagamentos e despesas. O fluxo de caixa do mês atual se calcula sozinho.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Dados protegidos',
    texto: 'Sua clínica isolada das outras, com registro de quem alterou cada informação e trilha de auditoria.',
  },
  {
    icone: Clock,
    titulo: 'Feito para o consultório',
    texto: 'Cadastro de paciente em segundos. Pensado para atender com o paciente esperando na cadeira.',
  },
  {
    icone: Stethoscope,
    titulo: 'Multiprofissional',
    texto: 'Vários dentistas na mesma clínica, cada um com seus atendimentos e seu próprio acesso.',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [planos, setPlanos] = useState<Plano[]>([]);

  useEffect(() => {
    fetch('/api/plataforma/planos')
      .then((r) => (r.ok ? r.json() : []))
      .then(setPlanos)
      .catch(() => setPlanos([]));
  }, []);

  // Quem já entrou vai direto para o painel. Precisa ser /dashboard: se fosse
// "/", a Home redirecionaria para si mesma, em laço infinito.
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const lista = planos.length ? planos : [
    { slug: 'essencial', nome: 'Essencial', max_dentistas: 1, max_usuarios: 3, preco_mensal: 149, recursos: [] },
    { slug: 'profissional', nome: 'Profissional', max_dentistas: 3, max_usuarios: 10, preco_mensal: 279, recursos: [] },
    { slug: 'clinica', nome: 'Clínica', max_dentistas: 5, max_usuarios: 25, preco_mensal: 449, recursos: [] },
  ];

  const destaque = lista[1];

  return (
    <div className="min-h-screen bg-white">
      {/* Topo */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white">
              <Smile className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-bold text-slate-900">OdontoClinic</p>
              <p className="text-[11px] text-slate-500">Gestão para clínicas odontológicas</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#recursos" className="hover:text-sky-600">Recursos</a>
            <a href="#planos" className="hover:text-sky-600">Planos</a>
            <a href="#seguranca" className="hover:text-sky-600">Segurança</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(14,165,233,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-semibold text-sky-700">
            <Star className="h-3.5 w-3.5" />
            Feito para dentistas, não para prontuário genérico
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Sua clínica odontológica{' '}
            <span className="bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent">
              organizada de verdade
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Agenda, prontuário, odontograma e financeiro em um só lugar. Você atende, o sistema cuida do
            resto — e o paciente não espera no balcão.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/cadastro"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 sm:w-auto"
            >
              Criar conta da clínica
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#planos"
              className="w-full rounded-xl border border-slate-300 px-7 py-3.5 text-center text-base font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
            >
              Ver planos
            </a>
          </div>

          <p className="mt-4 text-sm text-slate-500">7 dias grátis · sem cartão de crédito</p>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="border-t border-slate-100 bg-slate-50/70 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">Tudo que a clínica precisa, no mesmo lugar</h2>
            <p className="mt-3 text-slate-600">
              Sem integrar cinco sistemas diferentes. Sem digitar o mesmo paciente três vezes.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <div
                key={titulo}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/60"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition group-hover:bg-sky-600 group-hover:text-white">
                  <Icone className="h-5.5 w-5.5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">Planos que cabem na consultório</h2>
            <p className="mt-3 text-slate-600">
              Um valor fixo por mês. Sem surpresa no orçamento da clínica.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {lista.map((p) => {
              const ehDestaque = p.slug === destaque?.slug;
              return (
                <div
                  key={p.slug}
                  className={`relative flex flex-col rounded-2xl border p-7 ${
                    ehDestaque
                      ? 'border-sky-500 bg-white shadow-xl shadow-sky-600/10 lg:-my-3 lg:py-10'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {ehDestaque && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-3.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                      Mais escolhido
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-slate-900">{p.nome}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    até {p.max_dentistas} dentista{p.max_dentistas > 1 ? 's' : ''} · {p.max_usuarios} usuários
                  </p>

                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900">{money(p.preco_mensal)}</span>
                    <span className="text-sm text-slate-500">/mês</span>
                  </p>

                  <ul className="mt-6 flex-1 space-y-3">
                    {(p.recursos.length ? p.recursos : ['Agenda e pacientes', 'Financeiro e orçamento', 'Odontograma']).map((r) => (
                      <li key={r} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {r}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/cadastro"
                    className={`mt-7 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
                      ehDestaque
                        ? 'bg-sky-600 text-white shadow-sm hover:bg-sky-700'
                        : 'border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Começar com {p.nome}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section id="seguranca" className="border-t border-slate-100 bg-slate-900 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Prontuário é dado sensível</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Tratamos a informação do paciente como o que é. Cada clínica tem uma base isolada, todo acesso é
            registrado e nada é compartilhado entre concorrentes.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { t: 'Isolamento por clínica', d: 'Os dados de uma clínica não podem ser acessados por outra' },
              { t: 'Trilha de auditoria', d: 'Quem criou, alterou ou excluiu cada registro' },
              { t: 'Senhas criptografadas', d: 'Guardadas com hash scrypt, nunca em texto legível' },
            ].map(({ t, d }) => (
              <div key={t} className="rounded-xl border border-white/10 bg-white/5 p-5 text-left">
                <ShieldCheck className="h-5 w-5 text-sky-400" />
                <p className="mt-3 font-semibold text-white">{t}</p>
                <p className="mt-1 text-sm text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Pronto para organizar sua clínica?</h2>
          <p className="mt-3 text-slate-600">Crie a conta agora e comece a cadastrar pacientes hoje mesmo.</p>
          <Link
            to="/cadastro"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
          >
            Criar conta grátis
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <Smile className="h-4 w-4 text-sky-500" />
            <span className="font-medium text-slate-700">OdontoClinic</span>
          </div>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-sky-600">Entrar</Link>
            <Link to="/cadastro" className="hover:text-sky-600">Criar conta</Link>
            <Link to="/recuperar-senha" className="hover:text-sky-600">Recuperar senha</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}