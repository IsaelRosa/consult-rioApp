import supabase from '../db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    const auth_id = req.query.auth_id || user.id;
    const { data, error: dbError } = await supabase.from('usuarios').select('*, perfis(*)').eq('auth_id', auth_id).single();
    if (dbError) {
      if (!data) {
        const perfil = await supabase.from('perfis').select('id').eq('slug', 'admin').single();
        const novo = await supabase.from('usuarios').insert({ auth_id: user.id, email: user.email, nome: user.email.split('@')[0], perfil_id: perfil.data?.id || 1, ativo: true }).select('*, perfis(*)').single();
        if (novo.error) throw novo.error;
        return res.status(200).json({ ...novo.data, perfil: novo.data.perfis });
      }
      throw dbError;
    }
    return res.status(200).json({ ...data, perfil: data.perfis });
  } catch (err) {
    console.error('API error usuarios/me:', err);
    res.status(500).json({ error: err.message });
  }
}
