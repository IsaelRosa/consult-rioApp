import supabase from './db-client.js';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('usuarios').select('*, perfis(*)').order('nome');
      if (error) throw error;
      return res.status(200).json(data.map(u => ({ ...u, perfil: u.perfis })));
    }
    if (req.method === 'POST') {
      const { nome, email, senha, perfil_id } = req.body;
      if (!nome || !email || !senha || !perfil_id) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      });
      if (authError) throw authError;
      const { data, error } = await supabase.from('usuarios').insert({
        auth_id: authData.user.id,
        email,
        nome,
        perfil_id,
        ativo: true,
      }).select('*, perfis(*)').single();
      if (error) throw error;
      return res.status(201).json({ ...data, perfil: data.perfis });
    }
    if (req.method === 'PUT') {
      const { id, ativo } = req.body;
      const { data, error } = await supabase.from('usuarios').update({ ativo }).eq('id', id).select('*, perfis(*)').single();
      if (error) throw error;
      return res.status(200).json({ ...data, perfil: data.perfis });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error usuarios:', err);
    res.status(500).json({ error: err.message });
  }
}
