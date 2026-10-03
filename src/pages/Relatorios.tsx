import { useApi } from '../hooks/useApi';
import type { DashboardStats } from '../types';
import { AlertCircle, Loader2, BarChart3 } from 'lucide-react';
import { moeda } from '../lib/format';

export default function Relatorios() {
  const { data: stats, loading, error } = useApi<DashboardStats>('/api/dashboard');

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-900">Relatórios</h1><p className="text-sm text-slate-500">Indicadores e estatísticas da clínica</p></div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Consultas hoje" value={stats?.consultasHoje ?? 0} />
        <Card title="Consultas na semana" value={stats?.consultasSemana ?? 0} />
        <Card title="Pacientes ativos" value={stats?.pacientesAtivos ?? 0} />
        <Card title="Saldo mês" value={moeda(stats?.saldoMes ?? 0)} />
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800"><BarChart3 className="h-5 w-5 text-sky-500" /> Consultas por status</h3>
        <div className="space-y-3">
          {stats?.consultasPorStatus.map((s) => (
            <div key={s.status} className="space-y-1">
              <div className="flex justify-between text-sm"><span className="font-medium text-slate-700 capitalize">{s.status}</span><span className="text-slate-500">{s.total}</span></div>
              <div className="h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (s.total / Math.max((stats.consultasPorStatus.reduce((a, b) => a + b.total, 0)), 1)) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
