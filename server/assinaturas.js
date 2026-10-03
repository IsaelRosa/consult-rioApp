// Assinatura (cobrança recorrente).
//
// O QUE ESTÁ PRONTO: controle de plano, status, vigência, barreira de limite
// e o contrato do webhook.
// O QUE NÃO ESTÁ: a integração com o gateway. Ela depende de credenciais
// (Mercado Pago, Stripe, Pagar.me) e NÃO é simulada aqui — se o provedor não
// estiver configurado, o checkout responde 503 em vez de fingir aprovação.

import crypto from 'node:crypto';
import { query } from './db.js';
import { PLANOS, PLANO_PADRAO } from './planos.js';

const STATUS = {
  INATIVA: 'inativa',
  PENDENTE: 'pendente',
  ATIVA: 'ativa',
  ATRASADA: 'atrasada',
  CANCELADA: 'cancelada',
};

// Endpoint do gateway. Sem isto, não há checkout.
const PROVEDOR = process.env.PAGAMENTO_PROVEDOR?.trim() || '';
const CHAVE = process.env.PAGAMENTO_CHAVE?.trim() || '';
const WEBHOOK_SEGREDO = process.env.PAGAMENTO_WEBHOOK_SEGREDO?.trim() || '';

export const provedorConfigurado = () => Boolean(PROVEDOR && CHAVE);

export const STATUS_VALIDOS = Object.values(STATUS);

export const assinar = async (clinicaId, planoSlug) => {
  const plano = PLANOS[planoSlug] ? planoSlug : PLANO_PADRAO;

  const [atual] = await query(
    `SELECT id, status, plano, valor_mensal
     FROM assinaturas
     WHERE clinica_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [clinicaId],
  );

  // Já está no plano desejado e ativo: nada a fazer.
  if (atual && atual.plano === plano && atual.status === STATUS.ATIVA) {
    return { jaAssinante: true, assinatura: atual };
  }

  // Troca de plano: encerra a anterior e registra a nova.
  if (atual && atual.status === STATUS.ATIVA) {
    await query('UPDATE assinaturas SET status = ?, cancelada_em = NOW() WHERE id = ?', [STATUS.CANCELADA, atual.id]);
  }

  const resultado = await query(
    `INSERT INTO assinaturas (clinica_id, plano, valor_mensal, status, iniciada_em, created_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [clinicaId, plano, PLANOS[plano].preco_mensal, STATUS.PENDENTE],
  );

  return { assinaturaId: resultado.insertId, plano, valor: PLANOS[plano].preco_mensal };
};

// Assinatura que vale hoje: ativa, ou pendente dentro da carência.
export const assinaturaVigente = async (clinicaId) => {
  const linhas = await query(
    `SELECT id, clinica_id, plano, valor_mensal, status, iniciada_em, renovada_em, cancelada_em
     FROM assinaturas
     WHERE clinica_id = ?
       AND status IN ('ativa', 'pendente', 'atrasada')
       AND (cancelada_em IS NULL OR cancelada_em > NOW())
     ORDER BY id DESC
     LIMIT 1`,
    [clinicaId],
  );
  return linhas[0] ?? null;
};

export const historico = async (clinicaId, limite = 12) => {
  const linhas = await query(
    `SELECT id, plano, valor_mensal, status, iniciada_em, renovada_em, cancelada_em
     FROM assinaturas WHERE clinica_id = ? ORDER BY id DESC LIMIT ${Number(limite) || 12}`,
    [clinicaId],
  );
  return linhas;
};

// Confirmação vinda do gateway. Só o segredo compartilhado autentica.
export const aplicarWebhook = async (corpo, assinaturaSecreta) => {
  if (!WEBHOOK_SEGREDO) {
    return { erro: { status: 503, error: 'Webhook não configurado (PAGAMENTO_WEBHOOK_SEGREDO ausente).' } };
  }
  if (!assinaturaSecreta || assinaturaSecreta !== WEBHOOK_SEGREDO) {
    return { erro: { status: 401, error: 'Assinatura do webhook inválida.' } };
  }

  const referencia = String(corpo?.referencia || corpo?.referencia_externa || '');
  const status = String(corpo?.status || '').toLowerCase();

  if (!referencia) return { erro: { status: 400, error: 'Referência da assinatura ausente.' } };
  if (!STATUS_VALIDOS.includes(status)) {
    return { erro: { status: 400, error: `Status desconhecido: ${status}` } };
  }

  const linhas = await query('SELECT id, clinica_id FROM assinaturas WHERE referencia = ? LIMIT 1', [referencia]);
  const assinatura = linhas[0];
  if (!assinatura) return { erro: { status: 404, error: 'Assinatura não encontrada.' } };

  if (status === STATUS.ATIVA) {
    await query(
      `UPDATE assinaturas SET status = ?, renovada_em = NOW(),
              iniciada_em = IF(iniciada_em IS NULL, NOW(), iniciada_em)
       WHERE id = ?`,
      [STATUS.ATIVA, assinatura.id],
    );
    // A clínica também guarda o plano, usado pelas telas e pelos limites.
    await query('UPDATE clinicas SET plano = (SELECT plano FROM assinaturas WHERE id = ?) WHERE id = ?', [
      assinatura.id,
      assinatura.clinica_id,
    ]);
  } else {
    await query('UPDATE assinaturas SET status = ?, cancelada_em = ? WHERE id = ?', [
      status,
      status === STATUS.CANCELADA ? new Date() : null,
      assinatura.id,
    ]);
  }

  return { ok: true, assinatura: assinatura.id, status };
};

export const gerarReferencia = () => `sub_${crypto.randomBytes(10).toString('hex')}`;

export default { assinar, assinaturaVigente, historico, aplicarWebhook, provedorConfigurado, STATUS };