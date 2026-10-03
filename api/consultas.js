import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { paciente_id, dentista_id } = req.query;
      let q = supabase.from('consultas').select('*, pacientes(*), dentistas(*)').order('data_hora_inicio', { ascending: true });
      if (paciente_id) q = q.eq('paciente_id', paciente_id);
      if (dentista_id) q = q.eq('dentista_id', dentista_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data.map(c => ({ ...c, paciente: c.pacientes, dentista: c.dentistas })));
    }
    if (req.method === 'POST') {
      const { paciente_id, dentista_id, data_hora_inicio, data_hora_fim, status, tipo, observacoes } = req.body;
      const { data, error } = await supabase.from('consultas').insert({
        paciente_id, dentista_id, data_hora_inicio, data_hora_fim, status, tipo, observacoes
      }).select('*, pacientes(*), dentistas(*)').single();
      if (error) throw error;
      return res.status(201).json({ ...data, paciente: data.pacientes, dentista: data.dentistas });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error consultas:', err);
    res.status(500).json({ error: err.message });
  }
}
