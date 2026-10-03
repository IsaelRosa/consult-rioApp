import { useState } from 'react';
import { useApi, apiFetch } from '../hooks/useApi';
import type { Paciente } from '../types';
import { Search, Plus, Edit2, Trash2, X, AlertCircle, Loader2 } from 'lucide-react';
import { telefoneBR, cpfMask } from '../lib/format';

const emptyPaciente: Partial<Paciente> = {
  nome: '', cpf: '', telefone: '', email: '', data_nascimento: '',
  sexo: '', endereco: '', cidade: '', estado: '', cep: '',
  convenio: '', numero_carteirinha: '', alergias: '', medicamentos: '', observacoes: '',
};

export default function Pacientes() {
  const { data: pacientes = [], loading, error, refetch } = useApi<Paciente[]>('/api/pacientes');
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Paciente>>(emptyPaciente);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.cpf || '').includes(busca) ||
    (p.telefone || '').includes(busca)
  );

  const abrirNovo = () => {
    setForm(emptyPaciente);
    setFormError('');
    setModalOpen(true);
  };

  const abrirEditar = (p: Paciente) => {
    setForm({ ...p, data_nascimento: p.data_nascimento || '' });
    setFormError('');
    setModalOpen(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.nome?.trim()) return setFormError('Nome é obrigatório.');
    setSaving(true);
    try {
      if (form.id) {
        await apiFetch(`/api/pacientes/${form.id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('/api/pacientes', { method: 'POST', body: JSON.stringify(form) });
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este paciente?')) return;
    try {
      await apiFetch(`/api/pacientes/${id}`, { method: 'DELETE' });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  }
  if (error) {
    return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">Cadastro e histórico dos pacientes</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
          <Plus className="h-4 w-4" /> Novo paciente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">CPF</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Convênio</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{cpfMask(p.cpf)}</td>
                  <td className="px-4 py-3 text-slate-600">{telefoneBR(p.telefone)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.convenio || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => abrirEditar(p)} className="mr-2 rounded p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => excluir(p.id)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtrados.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">Nenhum paciente encontrado.</div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{form.id ? 'Editar paciente' : 'Novo paciente'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>}
            <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
              <Input label="Nome *" value={form.nome || ''} onChange={(v) => setForm({ ...form, nome: v })} required />
              <Input label="CPF" value={form.cpf || ''} onChange={(v) => setForm({ ...form, cpf: v })} />
              <Input label="Telefone" value={form.telefone || ''} onChange={(v) => setForm({ ...form, telefone: v })} />
              <Input label="E-mail" type="email" value={form.email || ''} onChange={(v) => setForm({ ...form, email: v })} />
              <Input label="Data de nascimento" type="date" value={form.data_nascimento || ''} onChange={(v) => setForm({ ...form, data_nascimento: v })} />
              <Select label="Sexo" value={form.sexo || ''} onChange={(v) => setForm({ ...form, sexo: v })} options={['', 'Feminino', 'Masculino', 'Outro']} />
              <Input label="Endereço" value={form.endereco || ''} onChange={(v) => setForm({ ...form, endereco: v })} />
              <Input label="Cidade" value={form.cidade || ''} onChange={(v) => setForm({ ...form, cidade: v })} />
              <Input label="Estado" value={form.estado || ''} onChange={(v) => setForm({ ...form, estado: v })} />
              <Input label="CEP" value={form.cep || ''} onChange={(v) => setForm({ ...form, cep: v })} />
              <Input label="Convênio" value={form.convenio || ''} onChange={(v) => setForm({ ...form, convenio: v })} />
              <Input label="Nº carteirinha" value={form.numero_carteirinha || ''} onChange={(v) => setForm({ ...form, numero_carteirinha: v })} />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Alergias</label>
                <textarea value={form.alergias || ''} onChange={(e) => setForm({ ...form, alergias: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-sky-500 focus:outline-none" rows={2} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Medicamentos</label>
                <textarea value={form.medicamentos || ''} onChange={(e) => setForm({ ...form, medicamentos: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-sky-500 focus:outline-none" rows={2} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Observações</label>
                <textarea value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-sky-500 focus:outline-none" rows={2} />
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o || 'Selecione'}</option>)}
      </select>
    </div>
  );
}
