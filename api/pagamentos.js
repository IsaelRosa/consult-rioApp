import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('pagamentos').select('*, pacientes(*)').order('data_pagamento', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data.map(p => ({ ...p, paciente: p.pacientes })));
    }
    if (req.method === 'POST') {
      const body = req.body;
      if (body.orcamento_id) body.orcamento_id = body.orcamento_id || null;
      const { data, error } = await supabase.from('pagamentos').insert(body).select('*, pacientes(*)').single();
      if (error) throw error;
      return res.status(201).json({ ...data, paciente: data.pacientes });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error pagamentos:', err);
    res.status(500).json({ error: err.message });
  }
}
