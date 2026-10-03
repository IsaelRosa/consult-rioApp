import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('orcamentos').select('*, pacientes(*), dentistas(*), orcamento_itens(*, procedimentos(*))').order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data.map(o => ({
        ...o,
        paciente: o.pacientes,
        dentista: o.dentistas,
        itens: (o.orcamento_itens || []).map(i => ({ ...i, procedimento: i.procedimentos })),
      })));
    }
    if (req.method === 'POST') {
      const { paciente_id, dentista_id, desconto, observacoes, itens } = req.body;
      const valor_total = itens.reduce((acc, i) => acc + i.quantidade * (i.valor_unitario || 0), 0) - (desconto || 0);
      const { data: orc, error } = await supabase.from('orcamentos').insert({
        paciente_id, dentista_id, desconto: desconto || 0, observacoes, valor_total,
      }).select().single();
      if (error) throw error;
      if (itens?.length) {
        await supabase.from('orcamento_itens').insert(itens.map(i => ({ ...i, orcamento_id: orc.id })));
      }
      return res.status(201).json(orc);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error orcamentos:', err);
    res.status(500).json({ error: err.message });
  }
}
