import { useState } from 'react';
import { useApi, apiFetch } from '../hooks/useApi';
import type { Dentista } from '../types';
import { Plus, Edit2, Trash2, X, AlertCircle, Loader2 } from 'lucide-react';

const emptyDentista: Partial<Dentista> = { nome: '', cro: '', especialidade: '', telefone: '', email: '', cor_agenda: '#0ea5e9', ativo: true };

export default function Dentistas() {
  const { data: dentistas = [], loading, error, refetch } = useApi<Dentista[]>('/api/dentistas');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Dentista>>(emptyDentista);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const abrirNovo = () => { setForm(emptyDentista); setFormError(''); setModalOpen(true); };
  const abrirEditar = (d: Dentista) => { setForm(d); setFormError(''); setModalOpen(true); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome?.trim() || !form.cro?.trim()) return setFormError('Nome e CRO são obrigatórios.');
    setSaving(true);
    try {
      if (form.id) await apiFetch(`/api/dentistas/${form.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await apiFetch('/api/dentistas', { method: 'POST', body: JSON.stringify(form) });
      setModalOpen(false);
      refetch();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir dentista?')) return;
    try { await apiFetch(`/api/dentistas/${id}`, { method: 'DELETE' }); refetch(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Erro ao excluir'); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dentistas</h1>
          <p className="text-sm text-slate-500">Profissionais e especialidades</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Plus className="h-4 w-4" /> Novo dentista</button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">CRO</th><th className="px-4 py-3">Especialidade</th><th className="px-4 py-3">Cor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y">
            {dentistas.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{d.nome}</td>
                <td className="px-4 py-3 text-slate-600">{d.cro}</td>
                <td className="px-4 py-3 text-slate-600">{d.especialidade || '-'}</td>
                <td className="px-4 py-3"><div className="h-5 w-5 rounded-full" style={{ backgroundColor: d.cor_agenda }} /></td>
                <td className="px-4 py-3 text-slate-600">{d.ativo ? 'Ativo' : 'Inativo'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => abrirEditar(d)} className="mr-2 rounded p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => excluir(d.id)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">{form.id ? 'Editar' : 'Novo'} dentista</h2><button onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            {formError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>}
            <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium text-slate-700">Nome *</label><input value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">CRO *</label><input value={form.cro || ''} onChange={(e) => setForm({ ...form, cro: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Especialidade</label><input value={form.especialidade || ''} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Telefone</label><input value={form.telefone || ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label><input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Cor agenda</label><input type="color" value={form.cor_agenda || '#0ea5e9'} onChange={(e) => setForm({ ...form, cor_agenda: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-1 py-1" /></div>
              <div className="flex items-center gap-2"><input id="ativo" type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /><label htmlFor="ativo" className="text-sm text-slate-700">Ativo</label></div>
              <div className="flex gap-3 sm:col-span-2"><button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70">{saving ? 'Salvando...' : 'Salvar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
