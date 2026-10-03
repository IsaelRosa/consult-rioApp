import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { paciente_id } = req.query;
      let q = supabase.from('odontograma').select('*, procedimentos(*)').order('dente');
      if (paciente_id) q = q.eq('paciente_id', paciente_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data.map(o => ({ ...o, procedimento: o.procedimentos })));
    }
    if (req.method === 'POST') {
      const { paciente_id, dente, face, condicao, procedimento_id, observacoes, data_registro } = req.body;
      const { data: existing } = await supabase.from('odontograma').select('id').eq('paciente_id', paciente_id).eq('dente', dente).eq('face', face).single();
      if (existing?.id) {
        const { data, error } = await supabase.from('odontograma').update({ condicao, procedimento_id: procedimento_id || null, observacoes }).eq('id', existing.id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      const { data, error } = await supabase.from('odontograma').insert({
        paciente_id, dente, face, condicao, procedimento_id: procedimento_id || null, observacoes, data_registro,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error odontograma:', err);
    res.status(500).json({ error: err.message });
  }
}
