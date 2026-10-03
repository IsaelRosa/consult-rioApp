import { useParams, useNavigate } from 'react-router-dom';
import { useApi, apiFetch } from '../hooks/useApi';
import type { Consulta, Procedimento, Tratamento } from '../types';
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { dataHoraBR, moeda } from '../lib/format';
import { useState } from 'react';

const STATUS_OPTIONS = ['agendado', 'confirmado', 'atendimento', 'concluido', 'cancelado', 'faltou'];

export default function ConsultaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: consulta, loading, error, refetch } = useApi<Consulta>(`/api/consultas/${id}`);
  const { data: procedimentos = [] } = useApi<Procedimento[]>('/api/procedimentos');
  const { data: tratamentos = [] } = useApi<Tratamento[]>(`/api/tratamentos?paciente_id=${consulta?.paciente_id || 0}`);
  const [status, setStatus] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [addProcOpen, setAddProcOpen] = useState(false);
  const [procForm, setProcForm] = useState({ procedimento_id: 0, dente: '', quantidade: 1, valor_cobrado: 0 });

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error || !consulta) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error || 'Consulta não encontrada'}</div>;

  const salvarStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/consultas/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, observacoes }) });
      refetch();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erro'); }
    finally { setSaving(false); }
  };

  const adicionarProcedimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procForm.procedimento_id || !consulta.paciente_id || !consulta.dentista_id) return;
    try {
      await apiFetch('/api/procedimentos-consulta', {
        method: 'POST',
        body: JSON.stringify({
          consulta_id: consulta.id,
          paciente_id: consulta.paciente_id,
          dentista_id: consulta.dentista_id,
          ...procForm,
        }),
      });
      setAddProcOpen(false);
      refetch();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erro'); }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/agenda')} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sky-600"><ArrowLeft className="h-4 w-4" /> Voltar à agenda</button>
      <div className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consulta #{consulta.id}</h1>
          <p className="text-slate-500">{dataHoraBR(consulta.data_hora_inicio)} • {consulta.dentista?.nome}</p>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-sm font-semibold ${statusClass(consulta.status)}`}>{consulta.status}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Dados do paciente</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-slate-500">Nome</p><p className="font-medium text-slate-900">{consulta.paciente?.nome}</p></div>
              <div><p className="text-xs text-slate-500">Telefone</p><p className="font-medium text-slate-900">{consulta.paciente?.telefone || '-'}</p></div>
              <div><p className="text-xs text-slate-500">E-mail</p><p className="font-medium text-slate-900">{consulta.paciente?.email || '-'}</p></div>
              <div><p className="text-xs text-slate-500">Convênio</p><p className="font-medium text-slate-900">{consulta.paciente?.convenio || '-'}</p></div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Procedimentos realizados</h2>
              <button onClick={() => setAddProcOpen(true)} className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"><Plus className="h-3.5 w-3.5" /> Procedimento</button>
            </div>
            {(consulta as unknown as { procedimentos?: { id: number; procedimento?: Procedimento; dente?: string; quantidade: number; valor_cobrado: number }[] }).procedimentos?.length ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Procedimento</th><th className="px-3 py-2">Dente</th><th className="px-3 py-2">Qtd</th><th className="px-3 py-2 text-right">Valor</th></tr></thead>
                <tbody className="divide-y">
                  {(consulta as unknown as { procedimentos: { id: number; procedimento?: Procedimento; dente?: string; quantidade: number; valor_cobrado: number }[] }).procedimentos.map((p) => (
                    <tr key={p.id}><td className="px-3 py-2">{p.procedimento?.nome}</td><td className="px-3 py-2">{p.dente || '-'}</td><td className="px-3 py-2">{p.quantidade}</td><td className="px-3 py-2 text-right">{moeda(p.valor_cobrado)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-slate-400">Nenhum procedimento registrado.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={salvarStatus} className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Fluxo de atendimento</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select value={status || consulta.status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Observações</label>
                <textarea value={observacoes || consulta.observacoes || ''} onChange={(e) => setObservacoes(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" rows={4} />
              </div>
              <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Atualizar atendimento
              </button>
            </div>
          </form>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-800">Tratamentos do paciente</h2>
            {tratamentos.map((t) => (
              <div key={t.id} className="mb-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{t.descricao}</p>
                <p className="text-xs text-slate-500">{t.status} • {t.procedimentos?.length || 0} procedimentos</p>
              </div>
            ))}
            {!tratamentos.length && <p className="text-sm text-slate-400">Nenhum tratamento ativo.</p>}
          </div>
        </div>
      </div>

      {addProcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Adicionar procedimento</h2><button onClick={() => setAddProcOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            <form onSubmit={adicionarProcedimento} className="space-y-4">
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Procedimento</label>
                <select value={procForm.procedimento_id} onChange={(e) => {
                  const pid = Number(e.target.value);
                  const p = procedimentos.find((x) => x.id === pid);
                  setProcForm({ ...procForm, procedimento_id: pid, valor_cobrado: p?.valor_padrao || 0 });
                }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                  <option value="0">Selecione</option>
                  {procedimentos.filter(p => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome} - {moeda(p.valor_padrao || 0)}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Dente(s)</label><input value={procForm.dente} onChange={(e) => setProcForm({ ...procForm, dente: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="ex: 36, 37" /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Qtd</label><input type="number" min={1} value={procForm.quantidade} onChange={(e) => setProcForm({ ...procForm, quantidade: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Valor cobrado</label><input type="number" step="0.01" value={procForm.valor_cobrado} onChange={(e) => setProcForm({ ...procForm, valor_cobrado: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setAddProcOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">Salvar</button></div>
            </form>
          </div>
        </div>
      )}
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
