import supabase from '../../../db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { id } = req.query;
  try {
    if (req.method === 'PUT') {
      const { status, observacoes } = req.body;
      const update = { status };
      if (observacoes !== undefined) update.observacoes = observacoes;
      if (status === 'concluido' || status === 'cancelado') update.data_hora_fim = new Date().toISOString();
      const { data, error } = await supabase.from('consultas').update(update).eq('id', id).select('*, pacientes(*), dentistas(*)').single();
      if (error) throw error;
      return res.status(200).json({ ...data, paciente: data.pacientes, dentista: data.dentistas });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error consulta status:', err);
    res.status(500).json({ error: err.message });
  }
}
