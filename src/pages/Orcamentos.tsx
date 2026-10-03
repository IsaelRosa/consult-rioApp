import { useState } from 'react';
import { useApi, apiFetch } from '../hooks/useApi';
import type { Orcamento, Paciente, Dentista, Procedimento, OrcamentoItem } from '../types';
import { Plus, FileText, X, AlertCircle, Loader2, CheckCircle, Ban } from 'lucide-react';
import { moeda, dataBR } from '../lib/format';

const STATUS_OPTIONS = ['pendente', 'aprovado', 'rejeitado', 'expirado'];

export default function Orcamentos() {
  const { data: orcamentos = [], loading, error, refetch } = useApi<Orcamento[]>('/api/orcamentos');
  const { data: pacientes = [] } = useApi<Paciente[]>('/api/pacientes');
  const { data: dentistas = [] } = useApi<Dentista[]>('/api/dentistas');
  const { data: procedimentos = [] } = useApi<Procedimento[]>('/api/procedimentos');
  const [modalOpen, setModalOpen] = useState(false);
  const [pacienteId, setPacienteId] = useState(0);
  const [dentistaId, setDentistaId] = useState(0);
  const [itens, setItens] = useState<{ procedimento_id: number; dente: string; quantidade: number; valor_unitario: number }[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const total = itens.reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0) - desconto;

  const abrirNovo = () => {
    setPacienteId(0); setDentistaId(0); setItens([]); setDesconto(0); setObs('');
    setFormError(''); setModalOpen(true);
  };

  const adicionarItem = () => {
    setItens([...itens, { procedimento_id: 0, dente: '', quantidade: 1, valor_unitario: 0 }]);
  };

  const alterarItem = (idx: number, key: string, value: unknown) => {
    const novo = [...itens];
    (novo[idx] as Record<string, unknown>)[key] = value;
    if (key === 'procedimento_id') {
      const p = procedimentos.find((x) => x.id === value);
      novo[idx].valor_unitario = p?.valor_padrao || 0;
    }
    setItens(novo);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!pacienteId || !dentistaId || itens.length === 0) return setFormError('Preencha paciente, dentista e ao menos um item.');
    setSaving(true);
    try {
      await apiFetch('/api/orcamentos', {
        method: 'POST',
        body: JSON.stringify({
          paciente_id: pacienteId,
          dentista_id: dentistaId,
          desconto,
          observacoes: obs,
          itens,
        }),
      });
      setModalOpen(false);
      refetch();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const alterarStatus = async (id: number, status: string) => {
    try { await apiFetch(`/api/orcamentos/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }); refetch(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Erro'); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1><p className="text-sm text-slate-500">Propostas de tratamento</p></div>
        <button onClick={abrirNovo} className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Plus className="h-4 w-4" /> Novo orçamento</button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Paciente</th><th className="px-4 py-3">Dentista</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
          <tbody className="divide-y">
            {orcamentos.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{o.paciente?.nome}</td>
                <td className="px-4 py-3 text-slate-600">{o.dentista?.nome}</td>
                <td className="px-4 py-3 text-slate-600">{moeda(o.valor_total)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(o.status)}`}>{o.status}</span></td>
                <td className="px-4 py-3 text-right">
                  {o.status === 'pendente' && (
                    <>
                      <button onClick={() => alterarStatus(o.id, 'aprovado')} className="mr-2 rounded p-1.5 text-emerald-600 hover:bg-emerald-50" title="Aprovar"><CheckCircle className="h-4 w-4" /></button>
                      <button onClick={() => alterarStatus(o.id, 'rejeitado')} className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Rejeitar"><Ban className="h-4 w-4" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Novo orçamento</h2><button onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            {formError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>}
            <form onSubmit={salvar} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Paciente *</label>
                  <select value={pacienteId} onChange={(e) => setPacienteId(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"><option value="0">Selecione</option>{pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                </div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Dentista *</label>
                  <select value={dentistaId} onChange={(e) => setDentistaId(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"><option value="0">Selecione</option>{dentistas.filter(d => d.ativo).map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between"><label className="text-sm font-medium text-slate-700">Itens</label><button type="button" onClick={adicionarItem} className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">+ Adicionar</button></div>
                <div className="space-y-2">
                  {itens.map((item, idx) => (
                    <div key={idx} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-5">
                      <select value={item.procedimento_id} onChange={(e) => alterarItem(idx, 'procedimento_id', Number(e.target.value))} className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm sm:col-span-2"><option value="0">Procedimento</option>{procedimentos.filter(p => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                      <input value={item.dente} onChange={(e) => alterarItem(idx, 'dente', e.target.value)} placeholder="Dente" className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
                      <input type="number" min={1} value={item.quantidade} onChange={(e) => alterarItem(idx, 'quantidade', Number(e.target.value))} className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
                      <input type="number" step="0.01" value={item.valor_unitario} onChange={(e) => alterarItem(idx, 'valor_unitario', Number(e.target.value))} className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Desconto</label><input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Total</label><p className="text-lg font-bold text-emerald-600">{moeda(total)}</p></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Observações</label><textarea value={obs} onChange={(e) => setObs(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70">{saving ? 'Salvando...' : 'Salvar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function statusClass(status: string) {
  switch (status) {
    case 'aprovado': return 'bg-emerald-100 text-emerald-700';
    case 'pendente': return 'bg-sky-100 text-sky-700';
    case 'rejeitado': return 'bg-red-100 text-red-700';
    case 'expirado': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-600';
  }
}
