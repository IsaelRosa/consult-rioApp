import { useApi } from '../hooks/useApi';
import type { DashboardStats, Consulta } from '../types';
import { CalendarDays, Users, DollarSign, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { dataBR, dataHoraBR, moeda } from '../lib/format';

export default function Dashboard() {
  const { data: stats, loading, error } = useApi<DashboardStats>('/api/dashboard');

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }
  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <AlertCircle className="mb-2 h-6 w-6" />
        {error || 'Não foi possível carregar o dashboard'}
      </div>
    );
  }

  const kpis = [
    { label: 'Consultas hoje', value: stats.consultasHoje, icon: CalendarDays, color: 'bg-sky-100 text-sky-600' },
    { label: 'Pacientes ativos', value: stats.pacientesAtivos, icon: Users, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Faturamento mês', value: moeda(stats.faturamentoMes), icon: DollarSign, color: 'bg-amber-100 text-amber-600' },
    { label: 'Saldo mês', value: moeda(stats.saldoMes), icon: TrendingUp, color: 'bg-violet-100 text-violet-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral da clínica em tempo real</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{kpi.value}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${kpi.color}`}>
                <kpi.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Receitas x Despesas (últimos 6 meses)</h3>
          <div className="space-y-3">
            {stats.faturamentoUltimosMeses.map((m) => (
              <div key={m.mes} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{m.mes}</span>
                  <span className="text-slate-500">{moeda(m.receitas)} / {moeda(m.despesas)}</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, (m.receitas / Math.max(m.receitas + m.despesas, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.faturamentoUltimosMeses.length === 0 && (
              <p className="text-sm text-slate-400">Sem dados financeiros no período.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <Clock className="h-5 w-5 text-sky-500" /> Próximas consultas
          </h3>
          <div className="space-y-3">
            {stats.proximasConsultas.map((c: Consulta) => (
              <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-medium text-slate-800">{c.paciente?.nome}</p>
                <p className="text-xs text-slate-500">
                  {dataHoraBR(c.data_hora_inicio)} • {c.dentista?.nome}
                </p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(c.status)}`}>
                  {c.status}
                </span>
              </div>
            ))}
            {stats.proximasConsultas.length === 0 && (
              <p className="text-sm text-slate-400">Nenhuma consulta próxima.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function statusClass(status: string) {
  switch (status) {
    case 'confirmado': return 'bg-emerald-100 text-emerald-700';
    case 'agendado': return 'bg-sky-100 text-sky-700';
    case 'atendimento': return 'bg-amber-100 text-amber-700';
    case 'concluido': return 'bg-violet-100 text-violet-700';
    case 'cancelado': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}
