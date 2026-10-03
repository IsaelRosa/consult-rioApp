import supabase from '../../../db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { id } = req.query;
  try {
    if (req.method === 'PUT') {
      const { ativo } = req.body;
      const { data, error } = await supabase.from('usuarios').update({ ativo }).eq('id', id).select('*, perfis(*)').single();
      if (error) throw error;
      return res.status(200).json({ ...data, perfil: data.perfis });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error usuario ativo:', err);
    res.status(500).json({ error: err.message });
  }
}
