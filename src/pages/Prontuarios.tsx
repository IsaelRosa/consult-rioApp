import { useState } from 'react';
import { useApi, apiFetch } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import type { Paciente, Consulta, Tratamento } from '../types';
import { Search, FileText, Calendar, AlertCircle, Loader2, X } from 'lucide-react';
import { dataBR, moeda } from '../lib/format';

export default function Prontuarios() {
  const { data: pacientes = [], loading, error } = useApi<Paciente[]>('/api/pacientes');
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<Paciente | null>(null);

  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.cpf || '').includes(busca)
  );

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prontuários</h1>
        <p className="text-sm text-slate-500">Histórico clínico dos pacientes</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-4"><h2 className="font-semibold text-slate-800">Pacientes</h2></div>
          <div className="max-h-[600px] overflow-y-auto">
            {filtrados.map((p) => (
              <button key={p.id} onClick={() => setSelecionado(p)} className={`w-full border-b p-4 text-left transition hover:bg-slate-50 ${selecionado?.id === p.id ? 'bg-sky-50' : ''}`}>
                <p className="font-medium text-slate-800">{p.nome}</p>
                <p className="text-xs text-slate-500">{p.convenio || 'Particular'}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {selecionado ? <ProntuarioDetalhe paciente={selecionado} /> : (
            <div className="flex h-96 flex-col items-center justify-center rounded-xl border bg-white text-slate-400">
              <FileText className="mb-2 h-10 w-10" />
              <p>Selecione um paciente para ver o prontuário</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProntuarioDetalhe({ paciente }: { paciente: Paciente }) {
  const { data: consultas = [], loading: l1 } = useApi<Consulta[]>(`/api/consultas?paciente_id=${paciente.id}`);
  const { data: tratamentos = [], loading: l2 } = useApi<Tratamento[]>(`/api/tratamentos?paciente_id=${paciente.id}`);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">{paciente.nome}</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-500">Nascimento:</span> {dataBR(paciente.data_nascimento)}</div>
          <div><span className="text-slate-500">Sexo:</span> {paciente.sexo || '-'}</div>
          <div><span className="text-slate-500">Telefone:</span> {paciente.telefone || '-'}</div>
          <div><span className="text-slate-500">E-mail:</span> {paciente.email || '-'}</div>
          <div className="sm:col-span-2"><span className="text-slate-500">Alergias:</span> {paciente.alergias || 'Nenhuma registrada'}</div>
          <div className="sm:col-span-2"><span className="text-slate-500">Medicamentos:</span> {paciente.medicamentos || 'Nenhum registrado'}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800"><Calendar className="h-5 w-5 text-sky-500" /> Consultas</h3>
        {l1 ? <Loader2 className="h-5 w-5 animate-spin" /> : consultas.length ? (
          <div className="space-y-2">
            {consultas.map((c) => (
              <Link key={c.id} to={`/consulta/${c.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm hover:border-sky-200">
                <div><p className="font-medium text-slate-800">{new Date(c.data_hora_inicio).toLocaleString('pt-BR')}</p><p className="text-xs text-slate-500">{c.dentista?.nome} • {c.status}</p></div>
                <span className="text-sky-600 hover:underline">Ver</span>
              </Link>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">Nenhuma consulta registrada.</p>}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-800">Tratamentos</h3>
        {l2 ? <Loader2 className="h-5 w-5 animate-spin" /> : tratamentos.length ? (
          <div className="space-y-2">
            {tratamentos.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{t.descricao}</p>
                <p className="text-xs text-slate-500">{t.status} • {t.procedimentos?.length || 0} procedimento(s)</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">Nenhum tratamento registrado.</p>}
      </div>
    </div>
  );
}
