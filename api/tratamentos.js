import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { paciente_id, dentista_id } = req.query;
      let q = supabase.from('tratamentos').select('*, pacientes(*), dentistas(*), tratamento_procedimentos(*, procedimentos(*))').order('created_at', { ascending: false });
      if (paciente_id) q = q.eq('paciente_id', paciente_id);
      if (dentista_id) q = q.eq('dentista_id', dentista_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data.map(t => ({
        ...t,
        paciente: t.pacientes,
        dentista: t.dentistas,
        procedimentos: (t.tratamento_procedimentos || []).map(p => ({ ...p, procedimento: p.procedimentos })),
      })));
    }
    if (req.method === 'POST') {
      const { paciente_id, dentista_id, descricao, data_inicio, procedimentos } = req.body;
      const { data: trat, error } = await supabase.from('tratamentos').insert({ paciente_id, dentista_id, descricao, data_inicio }).select().single();
      if (error) throw error;
      if (procedimentos?.length) {
        await supabase.from('tratamento_procedimentos').insert(procedimentos.map(p => ({ ...p, tratamento_id: trat.id })));
      }
      return res.status(201).json(trat);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error tratamentos:', err);
    res.status(500).json({ error: err.message });
  }
}
