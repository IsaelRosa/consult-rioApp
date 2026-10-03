import { useState } from 'react';
import { useApi, apiFetch } from '../hooks/useApi';
import type { Usuario, Perfil } from '../types';
import { Plus, X, AlertCircle, Loader2, Shield, CheckCircle, Ban } from 'lucide-react';

export default function Usuarios() {
  const { data: usuarios = [], loading, error, refetch } = useApi<Usuario[]>('/api/usuarios');
  const { data: perfis = [] } = useApi<Perfil[]>('/api/perfis');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', perfil_id: 1, senha: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.nome || !form.email || !form.senha || !form.perfil_id) return setFormError('Preencha todos os campos.');
    setSaving(true);
    try {
      await apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify(form) });
      setModalOpen(false);
      refetch();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try { await apiFetch(`/api/usuarios/${id}/ativo`, { method: 'PUT', body: JSON.stringify({ ativo }) }); refetch(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Erro'); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Usuários</h1><p className="text-sm text-slate-500">Gestão de acesso e perfis</p></div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Plus className="h-4 w-4" /> Novo usuário</button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
          <tbody className="divide-y">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{u.nome}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{u.perfil?.nome}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleAtivo(u.id, !u.ativo)} className={`rounded p-1.5 ${u.ativo ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>{u.ativo ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Novo usuário</h2><button onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            {formError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>}
            <form onSubmit={salvar} className="space-y-4">
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Nome *</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">E-mail *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Senha *</label><input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Perfil *</label>
                <select value={form.perfil_id} onChange={(e) => setForm({ ...form, perfil_id: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
              </div>
              <div className="flex gap-3"><button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70">{saving ? 'Salvando...' : 'Salvar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
