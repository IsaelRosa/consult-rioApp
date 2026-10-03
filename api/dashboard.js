import supabase from './db-client.js';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function firstDayOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function lastDayOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = firstDayOfMonth(now);
    const monthEnd = lastDayOfMonth(now);

    const [hoje, semana, pacientesAtivos, pagamentosMes, despesasMes, porStatus, proximas, ultimosPagamentos, ultimasDespesas] = await Promise.all([
      supabase.from('consultas').select('*', { count: 'exact' }).gte('data_hora_inicio', todayStart).lte('data_hora_inicio', todayEnd),
      supabase.from('consultas').select('*', { count: 'exact' }).gte('data_hora_inicio', weekStart).lte('data_hora_inicio', endOfWeek(now)),
      supabase.from('pacientes').select('*', { count: 'exact' }),
      supabase.from('pagamentos').select('*').eq('status', 'pago').gte('data_pagamento', monthStart.slice(0, 10)).lte('data_pagamento', monthEnd.slice(0, 10)),
      supabase.from('despesas').select('*').eq('status', 'pago').gte('data_despesa', monthStart.slice(0, 10)).lte('data_despesa', monthEnd.slice(0, 10)),
      supabase.from('consultas').select('status').gte('data_hora_inicio', monthStart).lte('data_hora_inicio', monthEnd),
      supabase.from('consultas').select('*, pacientes(*), dentistas(*)').gte('data_hora_inicio', todayStart).order('data_hora_inicio', { ascending: true }).limit(10),
      supabase.from('pagamentos').select('data_pagamento, valor').eq('status', 'pago').order('data_pagamento', { ascending: true }),
      supabase.from('despesas').select('data_despesa, valor').eq('status', 'pago').order('data_despesa', { ascending: true }),
    ]);

    const statusCount = {};
    (porStatus.data || []).forEach(c => { statusCount[c.status] = (statusCount[c.status] || 0) + 1; });
    const consultasPorStatus = Object.entries(statusCount).map(([status, total]) => ({ status, total }));

    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      meses.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) });
    }
    const faturamentoUltimosMeses = meses.map(m => {
      const receitas = (ultimosPagamentos.data || []).filter(p => p.data_pagamento?.startsWith(m.key)).reduce((a, b) => a + Number(b.valor), 0);
      const despesas = (ultimasDespesas.data || []).filter(d => d.data_despesa?.startsWith(m.key)).reduce((a, b) => a + Number(b.valor), 0);
      return { mes: m.label, receitas, despesas };
    });

    const faturamentoMes = (pagamentosMes.data || []).reduce((a, b) => a + Number(b.valor), 0);
    const despesasMesTotal = (despesasMes.data || []).reduce((a, b) => a + Number(b.valor), 0);

    return res.status(200).json({
      consultasHoje: hoje.count || 0,
      consultasSemana: semana.count || 0,
      pacientesAtivos: pacientesAtivos.count || 0,
      faturamentoMes,
      despesasMes: despesasMesTotal,
      saldoMes: faturamentoMes - despesasMesTotal,
      consultasPorStatus,
      faturamentoUltimosMeses,
      proximasConsultas: (proximas.data || []).map(c => ({ ...c, paciente: c.pacientes, dentista: c.dentistas })),
    });
  } catch (err) {
    console.error('API error dashboard:', err);
    res.status(500).json({ error: err.message });
  }
}
