import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { consulta_id, paciente_id, dentista_id, procedimento_id, dente, quantidade, valor_cobrado } = req.body;
      const { data, error } = await supabase.from('consulta_procedimentos').insert({
        consulta_id, paciente_id, dentista_id, procedimento_id, dente, quantidade, valor_cobrado,
      }).select('*, procedimentos(*)').single();
      if (error) throw error;
      return res.status(201).json({ ...data, procedimento: data.procedimentos });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error procedimentos-consulta:', err);
    res.status(500).json({ error: err.message });
  }
}
