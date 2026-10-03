import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { telefone, mensagem } = req.body;
      if (!telefone || !mensagem) return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });

      if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
        const r = await fetch(process.env.WHATSAPP_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` },
          body: JSON.stringify({ to: telefone, body: mensagem }),
        });
        if (!r.ok) throw new Error(`WhatsApp API error: ${r.status}`);
        return res.status(200).json({ ok: true, provider: 'external' });
      }

      // Fallback: WhatsApp Web deep link para uso manual
      const numero = telefone.replace(/\D/g, '');
      const link = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
      return res.status(200).json({ ok: true, provider: 'fallback', link });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error whatsapp:', err);
    res.status(500).json({ error: err.message });
  }
}
