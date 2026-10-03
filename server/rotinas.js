// Rotinas periódicas: aviso de vencimento e suspensão por inadimplência.
//
// Roda uma vez por dia dentro do próprio processo do Node. Numa instalação
// com uma instância isso basta; se o app for replicado, cada instância
// executaria o mesmo job — o envio ficaria duplicado. Nesse caso, mover
// para cron do sistema ou para uma fila.

import { query } from './db.js';
import { avisoVencimento, avisoSuspensao } from './emails.js';

const DIA_MS = 86_400_000;
const AVISAR_ANTES = [7, 3, 1];
const SUSPENDER_APOS = 15; // dias de atraso

const inicioDoDia = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Uma vez por dia: avisar quem está prestes a vencer.
export const cobrarVencimentos = async () => {
  let enviados = 0;

  for (const dias of AVISAR_ANTES) {
    const alvo = new Date(inicioDoDia().getTime() + dias * DIA_MS);

    const linhas = await query(
      `SELECT a.id, a.plano, a.valor_mensal, a.renovada_em,
              c.nome AS clinica_nome, c.email AS clinica_email,
              u.nome AS admin_nome, u.email AS admin_email
       FROM assinaturas a
       JOIN clinicas c ON c.id = a.clinica_id
       LEFT JOIN usuarios u ON u.clinica_id = a.clinica_id AND u.perfil_id = 1 AND u.ativo = 1
       WHERE a.status = 'ativa'
         AND DATE(COALESCE(a.renovada_em, a.iniciada_em)) = ?`,
      [alvo.toISOString().slice(0, 10)],
    );

    for (const linha of linhas) {
      const resultado = await avisoVencimento({
        email: linha.admin_email ?? linha.clinica_email,
        nome: linha.admin_nome ?? linha.clinica_nome,
        clinica: linha.clinica_nome,
        plano: linha.plano,
        preco: linha.valor_mensal,
        dias,
      });
      if (resultado.entregue) enviados += 1;
    }
  }

  if (enviados) console.log(`[rotinas] ${enviados} aviso(s) de vencimento enviado(s)`);
  return enviados;
};

// Suspende quem passou do prazo de carência e avisa uma única vez.
export const suspenderInadimplentes = async () => {
  const limite = new Date(inicioDoDia().getTime() - SUSPENDER_APOS * DIA_MS);

  const linhas = await query(
    `SELECT a.id, a.plano, c.nome AS clinica_nome, c.email AS clinica_email, c.ativo AS clinica_ativa,
            u.nome AS admin_nome, u.email AS admin_email
     FROM assinaturas a
     JOIN clinicas c ON c.id = a.clinica_id
     LEFT JOIN usuarios u ON u.clinica_id = a.clinica_id AND u.perfil_id = 1 AND u.ativo = 1
     WHERE a.status IN ('ativa', 'atrasada')
       AND DATE(COALESCE(a.renovada_em, a.iniciada_em)) < ?`,
    [limite.toISOString().slice(0, 10)],
  );

  let suspensos = 0;

  for (const linha of linhas) {
    await query('UPDATE assinaturas SET status = ? WHERE id = ?', ['atrasada', linha.id]);
    // A clínica fica inativa: o login passa a recusar com mensagem clara.
    await query('UPDATE clinicas SET ativo = FALSE WHERE id = (SELECT clinica_id FROM assinaturas WHERE id = ?)', [
      linha.id,
    ]);

    await avisoSuspensao({
      email: linha.admin_email ?? linha.clinica_email,
      nome: linha.admin_nome ?? linha.clinica_nome,
      clinica: linha.clinica_nome,
      plano: linha.plano,
    });

    console.log(`[rotinas] assinatura ${linha.id} suspensa por inadimplência`);
    suspensos += 1;
  }

  return suspensos;
};

let timer = null;

export const iniciarRotinas = () => {
  if (timer) return;

  const rodar = async () => {
    try {
      await cobrarVencimentos();
      await suspenderInadimplentes();
    } catch (error) {
      console.warn('[rotinas] falha:', error.message);
    }
  };

  // Primeira execução após 1 minuto; depois, a cada 24h.
  timer = setInterval(rodar, DIA_MS);
  timer.unref?.();
  setTimeout(rodar, 60_000).unref?.();

  console.log('[rotinas] agenda diária iniciada');
};

export default { iniciarRotinas, cobrarVencimentos, suspenderInadimplentes };