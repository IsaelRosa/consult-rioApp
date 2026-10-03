import { useState } from 'react';
import { useApi, apiFetch } from '../hooks/useApi';
import type { Despesa, DashboardStats } from '../types';
import { Plus, TrendingDown, TrendingUp, DollarSign, X, AlertCircle, Loader2 } from 'lucide-react';
import { moeda } from '../lib/format';

const CATEGORIAS = ['Aluguel', 'Salários', 'Material', 'Equipamento', 'Marketing', 'Impostos', 'Outros'];
const FORMAS = ['Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'PIX', 'Boleto', 'Transferência'];

export default function Financeiro() {
  const { data: stats } = useApi<DashboardStats>('/api/dashboard');
  const { data: despesas = [], loading, error, refetch } = useApi<Despesa[]>('/api/despesas');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Despesa>>({ categoria: 'Outros', forma_pagamento: 'PIX', data_despesa: new Date().toISOString().slice(0, 10), status: 'pago' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.descricao || !form.valor) return setFormError('Descrição e valor são obrigatórios.');
    setSaving(true);
    try {
      await apiFetch('/api/despesas', { method: 'POST', body: JSON.stringify(form) });
      setModalOpen(false);
      refetch();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;

  const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Financeiro</h1><p className="text-sm text-slate-500">Receitas, despesas e fluxo de caixa</p></div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"><Plus className="h-4 w-4" /> Nova despesa</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Receitas mês" value={moeda(stats?.faturamentoMes || 0)} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
        <Kpi label="Despesas mês" value={moeda(totalDespesas)} icon={TrendingDown} color="bg-red-100 text-red-600" />
        <Kpi label="Saldo mês" value={moeda((stats?.faturamentoMes || 0) - totalDespesas)} icon={DollarSign} color="bg-sky-100 text-sky-600" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Forma</th><th className="px-4 py-3 text-right">Valor</th></tr></thead>
          <tbody className="divide-y">
            {despesas.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{new Date(d.data_despesa).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{d.descricao}</td>
                <td className="px-4 py-3 text-slate-600">{d.categoria}</td>
                <td className="px-4 py-3 text-slate-600">{d.forma_pagamento}</td>
                <td className="px-4 py-3 text-right font-medium text-red-600">{moeda(d.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Nova despesa</h2><button onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            {formError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>}
            <form onSubmit={salvar} className="space-y-4">
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Descrição *</label><input value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Valor *</label><input type="number" step="0.01" value={form.valor || ''} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Data</label><input type="date" value={form.data_despesa || ''} onChange={(e) => setForm({ ...form, data_despesa: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Forma</label>
                  <select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
                </div>
              </div>
              <div className="flex gap-3"><button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-70">{saving ? 'Salvando...' : 'Salvar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>
        <div className={`rounded-lg p-2.5 ${color}`}><Icon className="h-6 w-6" /></div>
      </div>
    </div>
  );
}
