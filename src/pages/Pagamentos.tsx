import { useState } from 'react';
import { useApi, apiFetch } from '../hooks/useApi';
import type { Pagamento, Paciente, Orcamento } from '../types';
import { Plus, X, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import { moeda, dataBR } from '../lib/format';

const FORMAS = ['Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'PIX', 'Boleto', 'Convênio'];
const STATUS_OPTIONS = ['pago', 'pendente', 'cancelado'];

export default function Pagamentos() {
  const { data: pagamentos = [], loading, error, refetch } = useApi<Pagamento[]>('/api/pagamentos');
  const { data: pacientes = [] } = useApi<Paciente[]>('/api/pacientes');
  const { data: orcamentos = [] } = useApi<Orcamento[]>('/api/orcamentos');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Pagamento>>({ forma_pagamento: 'PIX', status: 'pago', data_pagamento: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.paciente_id || !form.valor) return setFormError('Paciente e valor são obrigatórios.');
    setSaving(true);
    try {
      await apiFetch('/api/pagamentos', { method: 'POST', body: JSON.stringify(form) });
      setModalOpen(false);
      refetch();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Pagamentos</h1><p className="text-sm text-slate-500">Recebimentos e cobranças</p></div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> Registrar pagamento</button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Paciente</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Forma</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y">
            {pagamentos.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.paciente?.nome}</td>
                <td className="px-4 py-3 text-slate-600">{dataBR(p.data_pagamento)}</td>
                <td className="px-4 py-3 text-slate-600">{p.forma_pagamento}</td>
                <td className="px-4 py-3 text-slate-600">{moeda(p.valor)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : p.status === 'pendente' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Registrar pagamento</h2><button onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            {formError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>}
            <form onSubmit={salvar} className="space-y-4">
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Paciente *</label>
                <select value={form.paciente_id || 0} onChange={(e) => setForm({ ...form, paciente_id: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"><option value="0">Selecione</option>{pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Orçamento (opcional)</label>
                <select value={form.orcamento_id || ''} onChange={(e) => setForm({ ...form, orcamento_id: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"><option value="">Nenhum</option>{orcamentos.filter(o => o.status === 'aprovado').map((o) => <option key={o.id} value={o.id}>{o.paciente?.nome} - {moeda(o.valor_total)}</option>)}</select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Valor *</label><input type="number" step="0.01" value={form.valor || ''} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Data</label><input type="date" value={form.data_pagamento || ''} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Forma</label>
                  <select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
                </div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Pagamento['status'] })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                </div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Observações</label><textarea value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70">{saving ? 'Salvando...' : 'Salvar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
