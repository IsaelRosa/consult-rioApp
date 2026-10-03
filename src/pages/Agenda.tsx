import { useState, useMemo } from 'react';
import { useApi, apiFetch } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import type { Consulta, Paciente, Dentista } from '../types';
import { ChevronLeft, ChevronRight, Plus, Clock, User, Stethoscope, X, AlertCircle, Loader2 } from 'lucide-react';
import { dataHoraBR } from '../lib/format';

const STATUS_OPTIONS = ['agendado', 'confirmado', 'atendimento', 'concluido', 'cancelado', 'faltou'];

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: consultas = [], loading, error, refetch } = useApi<Consulta[]>('/api/consultas');
  const { data: pacientes = [] } = useApi<Paciente[]>('/api/pacientes');
  const { data: dentistas = [] } = useApi<Dentista[]>('/api/dentistas');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Consulta>>({ status: 'agendado' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  const startOfWeek = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startOfWeek]);

  const changeWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const consultasDoDia = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    return consultas.filter((c) => {
      const cd = new Date(c.data_hora_inicio);
      return cd.getFullYear() === y && cd.getMonth() === m && cd.getDate() === d;
    }).sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());
  };

  const abrirNova = () => {
    const base = new Date(currentDate);
    base.setMinutes(0);
    const inicio = base.toISOString().slice(0, 16);
    const fim = new Date(base.getTime() + 30 * 60000).toISOString().slice(0, 16);
    setForm({ data_hora_inicio: inicio, data_hora_fim: fim, status: 'agendado' });
    setFormError('');
    setModalOpen(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.paciente_id || !form.dentista_id || !form.data_hora_inicio) return setFormError('Paciente, dentista e horário são obrigatórios.');
    setSaving(true);
    try {
      await apiFetch('/api/consultas', { method: 'POST', body: JSON.stringify(form) });
      setModalOpen(false);
      refetch();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao agendar'); }
    finally { setSaving(false); }
  };

  const atualizarStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/consultas/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      refetch();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erro'); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700"><AlertCircle className="mb-2 h-6 w-6" />{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500">Agendamentos e atendimentos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeWeek(-1)} className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronLeft className="h-5 w-5" /></button>
          <span className="min-w-[140px] text-center text-sm font-medium text-slate-700">
            {weekDays[0].toLocaleDateString('pt-BR')} - {weekDays[6].toLocaleDateString('pt-BR')}
          </span>
          <button onClick={() => changeWeek(1)} className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronRight className="h-5 w-5" /></button>
          <button onClick={abrirNova} className="ml-2 flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Plus className="h-4 w-4" /> Agendar</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="rounded-xl border bg-white shadow-sm">
            <div className={`border-b p-3 text-center ${isSameDay(day, new Date()) ? 'bg-sky-50' : 'bg-slate-50'}`}>
              <p className="text-xs font-semibold uppercase text-slate-500">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
              <p className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-sky-600' : 'text-slate-800'}`}>{day.getDate()}</p>
            </div>
            <div className="space-y-2 p-2">
              {consultasDoDia(day).map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/consulta/${c.id}`)}
                  className="w-full rounded-lg border-l-4 p-2 text-left text-xs transition hover:bg-slate-50"
                  style={{ borderLeftColor: c.dentista?.cor_agenda || '#94a3b8' }}
                >
                  <p className="font-semibold text-slate-800">{new Date(c.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="truncate text-slate-600">{c.paciente?.nome}</p>
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${statusClass(c.status)}`}>{c.status}</span>
                </button>
              ))}
              {consultasDoDia(day).length === 0 && <p className="py-4 text-center text-xs text-slate-400">Sem consultas</p>}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Novo agendamento</h2><button onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            {formError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>}
            <form onSubmit={salvar} className="space-y-4">
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Paciente *</label>
                <select value={form.paciente_id || ''} onChange={(e) => setForm({ ...form, paciente_id: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                  <option value="">Selecione</option>
                  {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Dentista *</label>
                <select value={form.dentista_id || ''} onChange={(e) => setForm({ ...form, dentista_id: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                  <option value="">Selecione</option>
                  {dentistas.filter(d => d.ativo).map((d) => <option key={d.id} value={d.id}>{d.nome} - {d.especialidade}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Início *</label><input type="datetime-local" value={form.data_hora_inicio || ''} onChange={(e) => setForm({ ...form, data_hora_inicio: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Fim</label><input type="datetime-local" value={form.data_hora_fim || ''} onChange={(e) => setForm({ ...form, data_hora_fim: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select value={form.status || 'agendado'} onChange={(e) => setForm({ ...form, status: e.target.value as Consulta['status'] })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-slate-700">Observações</label><textarea value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" rows={2} /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70">{saving ? 'Salvando...' : 'Agendar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
