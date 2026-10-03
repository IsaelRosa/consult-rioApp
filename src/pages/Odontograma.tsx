import { useState } from 'react';
import { useApi, apiFetch } from '../hooks/useApi';
import type { Paciente, Procedimento, Odontograma } from '../types';
import { Search, AlertCircle, Loader2, Smile, X } from 'lucide-react';

const CONDICOES = [
  { value: 'saudavel', label: 'Saudável', color: '#10b981' },
  { value: 'carie', label: 'Cárie', color: '#ef4444' },
  { value: 'tratado', label: 'Tratado', color: '#3b82f6' },
  { value: 'extracao', label: 'Extração', color: '#f59e0b' },
  { value: 'pendente', label: 'Pendente', color: '#8b5cf6' },
  { value: 'observacao', label: 'Observação', color: '#64748b' },
];

const FACES = ['O', 'V', 'M', 'D', 'P', 'L'];

export default function OdontogramaPage() {
  const { data: pacientes = [], loading, error } = useApi<Paciente[]>('/api/pacientes');
  const { data: procedimentos = [] } = useApi<Procedimento[]>('/api/procedimentos');
  const [busca, setBusca] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const { data: registros = [], refetch } = useApi<Odontograma[]>(paciente ? `/api/odontograma?paciente_id=${paciente.id}` : null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [condicao, setCondicao] = useState('saudavel');
  const [face, setFace] = useState('O');
  const [observacao, setObservacao] = useState('');
  const [procId, setProcId] = useState<number | ''>('');

  const filtrados = pacientes.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));

  const arcoSuperior = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const arcoInferior = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const getRegistro = (dente: number, face?: string) => {
    return registros.find((r) => r.dente === dente && (!face || r.face === face));
  };

  const getColor = (dente: number) => {
    const r = getRegistro(dente);
    if (r) return CONDICOES.find((c) => c.value === r.condicao)?.color || '#94a3b8';
    return '#e2e8f0';
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente || !selectedTooth) return;
    try {
      await apiFetch('/api/odontograma', {
        method: 'POST',
        body: JSON.stringify({
          paciente_id: paciente.id,
          dente: selectedTooth,
          face,
          condicao,
          procedimento_id: procId || null,
          observacoes: observacao,
          data_registro: new Date().toISOString().slice(0, 10),
        }),
      });
      setSelectedTooth(null);
      refetch();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erro'); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Odontograma</h1>
        <p className="text-sm text-slate-500">Mapa dentário interativo</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none" />
      </div>
      <div className="flex flex-wrap gap-2">
        {filtrados.slice(0, 5).map((p) => (
          <button key={p.id} onClick={() => { setPaciente(p); setSelectedTooth(null); }} className={`rounded-full px-4 py-1.5 text-sm font-medium ${paciente?.id === p.id ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 border hover:bg-slate-50'}`}>
            {p.nome}
          </button>
        ))}
      </div>

      {paciente && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">{paciente.nome}</h2>
          <div className="space-y-6">
            <ToothRow teeth={arcoSuperior} getColor={getColor} onClick={setSelectedTooth} selected={selectedTooth} label="Arco superior" />
            <ToothRow teeth={arcoInferior} getColor={getColor} onClick={setSelectedTooth} selected={selectedTooth} label="Arco inferior" />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {CONDICOES.map((c) => (
              <div key={c.value} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} /> {c.label}
              </div>
            ))}
          </div>

          {selectedTooth && (
            <form onSubmit={salvar} className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 font-semibold text-slate-800">Dente {selectedTooth}</h3>
              <div className="grid gap-4 sm:grid-cols-4">
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Condição</label>
                  <select value={condicao} onChange={(e) => setCondicao(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-sky-500 focus:outline-none">
                    {CONDICOES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Face</label>
                  <select value={face} onChange={(e) => setFace(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-sky-500 focus:outline-none">
                    {FACES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-slate-700">Procedimento</label>
                  <select value={procId} onChange={(e) => setProcId(Number(e.target.value) || '')} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-sky-500 focus:outline-none">
                    <option value="">Nenhum</option>
                    {procedimentos.filter(p => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-slate-700">Observação</label><input value={observacao} onChange={(e) => setObservacao(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Salvar registro</button>
                <button type="button" onClick={() => setSelectedTooth(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function ToothRow({ teeth, getColor, onClick, selected, label }: { teeth: number[]; getColor: (d: number) => string; onClick: (d: number) => void; selected: number | null; label: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase text-slate-400">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {teeth.map((d) => (
          <button
            key={d}
            onClick={() => onClick(d)}
            className={`flex h-10 w-8 items-center justify-center rounded-md border text-xs font-semibold transition hover:scale-105 ${selected === d ? 'ring-2 ring-sky-600 ring-offset-2' : ''}`}
            style={{ backgroundColor: getColor(d), color: getColor(d) === '#e2e8f0' ? '#64748b' : '#fff', borderColor: '#cbd5e1' }}
            title={`Dente ${d}`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
