import supabase from '../../db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID obrigatório' });

  try {
    if (req.method === 'GET') {
      const { data: consulta, error } = await supabase.from('consultas').select('*, pacientes(*), dentistas(*)').eq('id', id).single();
      if (error) throw error;
      const { data: procedimentos, error: pErr } = await supabase.from('consulta_procedimentos').select('*, procedimentos(*)').eq('consulta_id', id);
      if (pErr) throw pErr;
      return res.status(200).json({
        ...consulta,
        paciente: consulta.pacientes,
        dentista: consulta.dentistas,
        procedimentos: procedimentos.map(p => ({ ...p, procedimento: p.procedimentos })),
      });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error consulta id:', err);
    res.status(500).json({ error: err.message });
  }
}
